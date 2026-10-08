from datetime import date, timedelta

def test_record_hydrotest_preserves_history(client):
    # 1. Create asset
    asset_res = client.post("/api/assets", json={
        "asset_id": "TEST-HIST-CYL",
        "site_id": 1,
        "asset_type": "VEHICLE_CYLINDER",
        "serial_number": "SN-HIST-990",
        "cylinder_number": "CYL-77402",
        "status": "ACTIVE"
    })
    asset_id = asset_res.json()["id"]

    # 2. Record first test (older test)
    t1_payload = {
        "asset_id": asset_id,
        "test_date": "2023-01-10",
        "performed_by": "Station Testing Corp",
        "result": "PASS",
        "next_due_date": "2026-01-09",
        "certificate_number": "CERT-HIST-01",
        "cylinder_number": "CYL-77402"
    }
    t1_res = client.post("/api/hydrotests", json=t1_payload)
    assert t1_res.status_code == 201

    # 3. Record second test (recent test)
    t2_payload = {
        "asset_id": asset_id,
        "test_date": "2026-01-15",
        "performed_by": "Station Testing Corp",
        "result": "PASS",
        "next_due_date": "2029-01-14",
        "certificate_number": "CERT-HIST-02",
        "cylinder_number": "CYL-77402"
    }
    t2_res = client.post("/api/hydrotests", json=t2_payload)
    assert t2_res.status_code == 201

    # 4. Fetch asset detail and ensure BOTH tests are preserved in history
    detail_res = client.get(f"/api/assets/{asset_id}")
    assert detail_res.status_code == 200
    data = detail_res.json()
    assert data["total_tests"] == 2
    assert len(data["hydrotests"]) == 2
    
    # Chronological sort (newest first)
    assert data["hydrotests"][0]["certificate_number"] == "CERT-HIST-02"
    assert data["hydrotests"][1]["certificate_number"] == "CERT-HIST-01"

def test_certificate_verification(client):
    # Create asset
    asset_res = client.post("/api/assets", json={
        "asset_id": "TEST-VERIF-CYL",
        "site_id": 1,
        "asset_type": "VEHICLE_CYLINDER",
        "serial_number": "SN-VERIF-101",
        "cylinder_number": "CYL-77402",
        "status": "ACTIVE"
    })
    asset_id = asset_res.json()["id"]

    # Record test with registered mock certificate PESO-GJ-2024-8841
    test_res = client.post("/api/hydrotests", json={
        "asset_id": asset_id,
        "test_date": "2024-04-15",
        "performed_by": "Gujarat Gas Testing Agency #4",
        "result": "PASS",
        "next_due_date": "2027-04-14",
        "certificate_number": "PESO-GJ-2024-8841",
        "cylinder_number": "CYL-77402"
    })
    test_id = test_res.json()["id"]

    # Trigger verification
    verif_res = client.post(f"/api/hydrotests/{test_id}/verify")
    assert verif_res.status_code == 200
    v_data = verif_res.json()
    assert v_data["verification_status"] == "VERIFIED"
    assert v_data["is_match"] is True

    # Record test with unknown certificate -> UNAVAILABLE status
    test_unknown = client.post("/api/hydrotests", json={
        "asset_id": asset_id,
        "test_date": "2024-05-10",
        "performed_by": "Local Shop",
        "result": "PASS",
        "next_due_date": "2027-05-09",
        "certificate_number": "UNKNOWN-CERT-999",
        "cylinder_number": "CYL-77402"
    })
    unk_id = test_unknown.json()["id"]
    unk_res = client.post(f"/api/hydrotests/{unk_id}/verify")
    assert unk_res.status_code == 200
    assert unk_res.json()["verification_status"] == "UNAVAILABLE"

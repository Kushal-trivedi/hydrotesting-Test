def test_create_asset_and_duplicate_handling(client):
    payload = {
        "asset_id": "TEST-CYL-001",
        "site_id": 1,
        "asset_type": "VEHICLE_CYLINDER",
        "serial_number": "SN-TEST-1001",
        "manufacturer": "Everest Kanto",
        "model": "Type-1 CNG",
        "capacity_liters": 60.0,
        "status": "ACTIVE"
    }

    # 1. Create successfully
    res = client.post("/api/assets", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["asset_id"] == "TEST-CYL-001"
    assert data["compliance_status"] == "PENDING"
    assert data["created_at"] is not None

    # 2. Reject duplicate asset_id
    duplicate_asset_id_payload = {**payload, "serial_number": "SN-DIFF-9999"}
    res_dup1 = client.post("/api/assets", json=duplicate_asset_id_payload)
    assert res_dup1.status_code == 409
    assert "already registered" in res_dup1.json()["detail"]

    # 3. Reject duplicate serial_number
    duplicate_serial_payload = {**payload, "asset_id": "TEST-CYL-002"}
    res_dup2 = client.post("/api/assets", json=duplicate_serial_payload)
    assert res_dup2.status_code == 409
    assert "already registered" in res_dup2.json()["detail"]

def test_search_and_filter_assets(client):
    # Register an asset with vehicle plate
    client.post("/api/assets", json={
        "asset_id": "TEST-SEARCH-01",
        "site_id": 1,
        "asset_type": "CASCADE_STORAGE",
        "serial_number": "SN-SEARCH-88",
        "vehicle_number": "GJ01XY7777",
        "status": "ACTIVE"
    })

    # Search by asset_id
    res = client.get("/api/assets?search=TEST-SEARCH")
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # Search by vehicle_number
    res = client.get("/api/assets?search=GJ01XY7777")
    assert res.status_code == 200
    assert len(res.json()) >= 1
    assert res.json()[0]["asset_id"] == "TEST-SEARCH-01"

    # Filter by asset_type
    res_type = client.get("/api/assets?asset_type=CASCADE_STORAGE")
    assert res_type.status_code == 200
    assert all(a["asset_type"] == "CASCADE_STORAGE" for a in res_type.json())

def test_update_asset(client):
    res_create = client.post("/api/assets", json={
        "asset_id": "TEST-UPDATE-01",
        "site_id": 1,
        "asset_type": "VEHICLE_CYLINDER",
        "serial_number": "SN-UPDATE-01",
        "status": "ACTIVE"
    })
    asset_id = res_create.json()["id"]

    res_update = client.put(f"/api/assets/{asset_id}", json={
        "manufacturer": "Updated Manufacturer Inc",
        "status": "INACTIVE"
    })
    assert res_update.status_code == 200
    assert res_update.json()["manufacturer"] == "Updated Manufacturer Inc"
    assert res_update.json()["status"] == "INACTIVE"

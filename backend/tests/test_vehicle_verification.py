def test_vehicle_lookup_success(client):
    res = client.post("/api/vehicles/lookup", json={"vehicle_number": "GJ01AB1234"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["vehicle_number"] == "GJ01AB1234"
    assert data["data"]["make"] == "Maruti Suzuki"
    assert data["data"]["is_cng"] is True

def test_vehicle_lookup_invalid_syntax(client):
    res = client.post("/api/vehicles/lookup", json={"vehicle_number": "INVALID$$$"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert "Invalid vehicle registration plate format" in data["message"]

def test_link_vehicle_to_asset(client):
    # 1. Create asset
    asset_res = client.post("/api/assets", json={
        "asset_id": "TEST-VEH-LINK",
        "site_id": 1,
        "asset_type": "VEHICLE_CYLINDER",
        "serial_number": "SN-LINK-554",
        "status": "ACTIVE"
    })
    asset_id = asset_res.json()["id"]

    # 2. Verify and link
    link_res = client.post(f"/api/vehicles/link-to-asset/{asset_id}", json={"vehicle_number": "GJ05EF9012"})
    assert link_res.status_code == 200
    data = link_res.json()
    assert data["vehicle_number"] == "GJ05EF9012"
    assert data["vehicle_make"] == "Tata Motors"
    assert data["vehicle_verified"] is True

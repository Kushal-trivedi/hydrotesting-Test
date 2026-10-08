import os
import json
from datetime import date, timedelta, datetime, timezone
from pathlib import Path
from app.config import settings
from app.database import engine, SessionLocal, Base
from app.models.site import Site
from app.models.asset import Asset
from app.models.hydrotest import HydrotestRecord
from app.models.document import Document
from app.models.audit import AuditLog

def create_sample_pdf(filepath: Path, cert_number: str, asset_id: str, result: str):
    """Creates a sample dummy PDF certificate file for viewing/downloading"""
    content = f"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 24 Tf
100 700 Td
(OFFICIAL HYDROSTATIC TEST CERTIFICATE) Tj
/F1 14 Tf
0 -40 Td
(Certificate No: {cert_number}) Tj
0 -25 Td
(Asset ID: {asset_id}) Tj
0 -25 Td
(Inspection Result: {result}) Tj
0 -25 Td
(Authorized Testing Agency - PESO Accredited Hub) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000261 00000 n 
0000000514 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
585
%%EOF
"""
    with open(filepath, "w", encoding="latin-1") as f:
        f.write(content)

def seed():
    print("Rebuilding database schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    upload_dir = settings.DOCUMENT_STORAGE_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        today = date.today()
        print(f"Current reference date: {today}")

        # 1. Create Sites
        sites = [
            Site(code="STN-AHD-01", name="Ahmedabad Central CNG Station", city="Ahmedabad", state="Gujarat"),
            Site(code="STN-SRT-02", name="Surat Hazira Port Gas Terminal", city="Surat", state="Gujarat"),
            Site(code="STN-RJK-03", name="Rajkot Ring Road Inspection Hub", city="Rajkot", state="Gujarat"),
            Site(code="STN-VAD-04", name="Vadodara Express Corridor Hub", city="Vadodara", state="Gujarat"),
        ]
        db.add_all(sites)
        db.commit()
        for s in sites:
            db.refresh(s)
        print(f"Seeded {len(sites)} stations.")

        # 2. Create Assets with all 5 compliance states
        assets_data = [
            # 1. VALID - Stationary Cascade
            {
                "asset": Asset(
                    asset_id="CNG-CAS-AHD-001",
                    site_id=sites[0].id,
                    asset_type="CASCADE_STORAGE",
                    serial_number="SN-CAS-99401",
                    manufacturer="Bharat Heavy Tanks Ltd",
                    model="Casc-Type1 3000L Bank",
                    capacity_liters=3000.0,
                    installation_date=today - timedelta(days=700),
                    cylinder_number="BNK-AHD-C1-88",
                    status="ACTIVE"
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=650),
                        "next_due_date": today - timedelta(days=650) + timedelta(days=1825),
                        "result": "PASS",
                        "performed_by": "Gujarat Gas Testing Agency #4",
                        "cert": "PESO-GJ-2024-8841",
                        "verification": "VERIFIED",
                        "test_p": 350.0,
                        "work_p": 250.0,
                        "notes": "Hydraulic expansion within 4% limit. Approved."
                    }
                ]
            },
            # 2. VALID - Vehicle CNG Cylinder
            {
                "asset": Asset(
                    asset_id="CNG-VEH-AHD-002",
                    site_id=sites[0].id,
                    asset_type="VEHICLE_CYLINDER",
                    serial_number="SN-CYL-88219",
                    manufacturer="Everest Kanto Cylinder Ltd (EKC)",
                    model="ISO 11439 Type 1 CNG-1",
                    capacity_liters=60.0,
                    installation_date=today - timedelta(days=400),
                    cylinder_number="CYL-88219",
                    vehicle_number="GJ01AB1234",
                    vehicle_make="Maruti Suzuki",
                    vehicle_model="WagonR 1.0 LXI CNG",
                    vehicle_fuel_type="CNG / Petrol",
                    vehicle_verified=True,
                    status="ACTIVE"
                ),
                "tests": [
                    # Prior test 3 years ago
                    {
                        "test_date": today - timedelta(days=1100),
                        "next_due_date": today - timedelta(days=1100) + timedelta(days=1095),
                        "result": "PASS",
                        "performed_by": "Gujarat Gas Testing Hub",
                        "cert": "PESO-GJ-2021-0022",
                        "verification": "VERIFIED",
                        "test_p": 335.0,
                        "work_p": 200.0,
                        "notes": "Initial cylinder certification."
                    },
                    # Latest test
                    {
                        "test_date": today - timedelta(days=100),
                        "next_due_date": today - timedelta(days=100) + timedelta(days=1095), # Due in ~995 days
                        "result": "PASS",
                        "performed_by": "Adani Total Gas Inspection Hub",
                        "cert": "PESO-GJ-2023-1102",
                        "verification": "VERIFIED",
                        "test_p": 340.0,
                        "work_p": 200.0,
                        "notes": "Retest pass. No external pitting or corrosion."
                    }
                ]
            },
            # 3. DUE_SOON - Vehicle CNG Cylinder (Due in 12 days)
            {
                "asset": Asset(
                    asset_id="CNG-VEH-SRT-003",
                    site_id=sites[1].id,
                    asset_type="VEHICLE_CYLINDER",
                    serial_number="SN-CYL-77402",
                    manufacturer="Everest Kanto Cylinder Ltd (EKC)",
                    model="CNG Type-1 65L Auto",
                    capacity_liters=65.0,
                    installation_date=today - timedelta(days=1083),
                    cylinder_number="CYL-77402",
                    vehicle_number="GJ05EF9012",
                    vehicle_make="Tata Motors",
                    vehicle_model="Tiago iCNG XT",
                    vehicle_fuel_type="CNG / Petrol",
                    vehicle_verified=True,
                    status="ACTIVE"
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=1083),
                        "next_due_date": today + timedelta(days=12), # DUE IN 12 DAYS
                        "result": "PASS",
                        "performed_by": "Surat District Testing Corp",
                        "cert": "PESO-GJ-2023-9912",
                        "verification": "NOT_VERIFIED",
                        "test_p": 335.0,
                        "work_p": 200.0,
                        "notes": "Hydrostatic stretch test passed. Follow-up due soon."
                    }
                ]
            },
            # 4. DUE_SOON - Station Dispenser Buffer (Due in 24 days)
            {
                "asset": Asset(
                    asset_id="CNG-BUF-VAD-004",
                    site_id=sites[3].id,
                    asset_type="DISPENSER_BUFFER",
                    serial_number="SN-BUF-33910",
                    manufacturer="Linde Engineering",
                    model="500L Fast-Fill Buffer Vessel",
                    capacity_liters=500.0,
                    installation_date=today - timedelta(days=1801),
                    cylinder_number="BUF-VAD-B2",
                    status="ACTIVE"
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=1801),
                        "next_due_date": today + timedelta(days=24), # DUE IN 24 DAYS
                        "result": "PASS",
                        "performed_by": "Vadodara Industrial Pressure Labs",
                        "cert": "PESO-VAD-2021-7781",
                        "verification": "VERIFIED",
                        "test_p": 375.0,
                        "work_p": 250.0,
                        "notes": "Buffer cylinder inspection valid."
                    }
                ]
            },
            # 5. OVERDUE - Commercial Cab Cylinder (Overdue by 15 days)
            {
                "asset": Asset(
                    asset_id="CNG-VEH-RJK-005",
                    site_id=sites[2].id,
                    asset_type="VEHICLE_CYLINDER",
                    serial_number="SN-CYL-11045",
                    manufacturer="Rama Cylinders Ltd",
                    model="Type-1 Light Cylinder 55L",
                    capacity_liters=55.0,
                    installation_date=today - timedelta(days=1110),
                    cylinder_number="CYL-11045",
                    vehicle_number="GJ06GH3456",
                    vehicle_make="Bajaj Auto",
                    vehicle_model="Maxima C CNG Cargo Auto",
                    vehicle_fuel_type="CNG",
                    vehicle_verified=True,
                    status="ACTIVE"
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=1110),
                        "next_due_date": today - timedelta(days=15), # OVERDUE BY 15 DAYS
                        "result": "PASS",
                        "performed_by": "Indraprastha Gas Cylinder Testing Unit",
                        "cert": "PESO-DL-2021-9944",
                        "verification": "VERIFIED",
                        "test_p": 330.0,
                        "work_p": 200.0,
                        "notes": "Expired! Needs immediate hydrotest testing."
                    }
                ]
            },
            # 6. OVERDUE - Cascade Storage (Overdue by 45 days)
            {
                "asset": Asset(
                    asset_id="CNG-CAS-SRT-006",
                    site_id=sites[1].id,
                    asset_type="CASCADE_STORAGE",
                    serial_number="SN-CAS-55120",
                    manufacturer="Euro India Cylinders",
                    model="High Pressure 4500L Storage",
                    capacity_liters=4500.0,
                    installation_date=today - timedelta(days=1870),
                    cylinder_number="CAS-SRT-04",
                    status="ACTIVE"
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=1870),
                        "next_due_date": today - timedelta(days=45), # OVERDUE BY 45 DAYS
                        "result": "PASS",
                        "performed_by": "Surat Safety Authority",
                        "cert": "PESO-SRT-2019-3321",
                        "verification": "NOT_VERIFIED",
                        "test_p": 350.0,
                        "work_p": 250.0,
                        "notes": "Critical: Cascade overdue for re-certification."
                    }
                ]
            },
            # 7. FAILED - Bus Cylinder (Pressure decay & permanent expansion failure)
            {
                "asset": Asset(
                    asset_id="CNG-VEH-AHD-007",
                    site_id=sites[0].id,
                    asset_type="VEHICLE_CYLINDER",
                    serial_number="SN-CYL-90012",
                    manufacturer="Everest Kanto Cylinder Ltd (EKC)",
                    model="Type-1 120L Commercial",
                    capacity_liters=120.0,
                    installation_date=today - timedelta(days=365),
                    cylinder_number="CYL-90012",
                    vehicle_number="GJ27JK7890",
                    vehicle_make="Tata Motors",
                    vehicle_model="Starbus CNG 32 Seater",
                    vehicle_fuel_type="CNG",
                    vehicle_verified=True,
                    status="ACTIVE"
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=20),
                        "next_due_date": today - timedelta(days=20), # FAILED
                        "result": "FAIL",
                        "performed_by": "Mahanagar Gas Hydro Testing Center",
                        "cert": "PESO-MH-2024-4450",
                        "verification": "VERIFIED",
                        "test_p": 320.0,
                        "work_p": 200.0,
                        "notes": "FAILED TEST: Permanent volumetric expansion exceeded 10% limit. Cylinder rejected from service."
                    }
                ]
            },
            # 8. PENDING - Newly Commissioned Asset (No hydrotests performed yet)
            {
                "asset": Asset(
                    asset_id="CNG-PIP-VAD-008",
                    site_id=sites[3].id,
                    asset_type="PIPELINE_HEADER",
                    serial_number="SN-PIP-44810",
                    manufacturer="Welspun Corp",
                    model="High Pressure 8-inch Manifold",
                    capacity_liters=800.0,
                    installation_date=today - timedelta(days=5),
                    cylinder_number="PIP-HDR-01",
                    status="ACTIVE"
                ),
                "tests": [] # NO TESTS YET -> PENDING COMPLIANCE
            },
            # 9. PENDING - Vehicle with Pending test status
            {
                "asset": Asset(
                    asset_id="CNG-VEH-RJK-009",
                    site_id=sites[2].id,
                    asset_type="VEHICLE_CYLINDER",
                    serial_number="SN-CYL-66104",
                    manufacturer="Rama Cylinders Ltd",
                    model="Type-1 60L",
                    capacity_liters=60.0,
                    installation_date=today - timedelta(days=30),
                    cylinder_number="CYL-66104",
                    vehicle_number="DL01XY9876",
                    vehicle_make="Maruti Suzuki",
                    vehicle_model="Eeco 5 STR AC CNG",
                    vehicle_fuel_type="CNG / Petrol",
                    vehicle_verified=True,
                    status="ACTIVE"
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=2),
                        "next_due_date": today + timedelta(days=1095),
                        "result": "PENDING", # TEST PENDING
                        "performed_by": "Rajkot Testing Facility",
                        "cert": "PEND-RJK-2026-001",
                        "verification": "NOT_VERIFIED",
                        "test_p": 330.0,
                        "work_p": 200.0,
                        "notes": "Cylinder submitted for test. Water jacket immersion in progress."
                    }
                ]
            }
        ]

        # Insert assets and test records
        for item in assets_data:
            asset = item["asset"]
            db.add(asset)
            db.commit()
            db.refresh(asset)

            for t in item["tests"]:
                # Generate sample certificate file
                filename = f"certificate_{t['cert']}.pdf"
                pdf_path = upload_dir / filename
                create_sample_pdf(pdf_path, t["cert"], asset.asset_id, t["result"])

                rec = HydrotestRecord(
                    asset_id=asset.id,
                    test_date=t["test_date"],
                    performed_by=t["performed_by"],
                    result=t["result"],
                    test_pressure_bar=t["test_p"],
                    working_pressure_bar=t["work_p"],
                    next_due_date=t["next_due_date"],
                    certificate_number=t["cert"],
                    cylinder_number=asset.cylinder_number,
                    notes=t["notes"],
                    report_filename=filename,
                    verification_status=t["verification"],
                    verification_payload=json.dumps({"seeded": True, "cert": t["cert"]})
                )
                db.add(rec)
                db.commit()
                db.refresh(rec)

                # Add document reference
                doc = Document(
                    hydrotest_record_id=rec.id,
                    filename=filename,
                    original_name=f"{t['cert']}_Report.pdf",
                    mime_type="application/pdf",
                    file_size=pdf_path.stat().st_size,
                    file_path=str(pdf_path)
                )
                db.add(doc)
                db.commit()

        print(f"Successfully seeded {len(assets_data)} assets across all 5 compliance states:")
        print(" - VALID (2 assets)")
        print(" - DUE_SOON (2 assets)")
        print(" - OVERDUE (2 assets)")
        print(" - FAILED (1 asset)")
        print(" - PENDING (2 assets)")

    finally:
        db.close()

if __name__ == "__main__":
    seed()

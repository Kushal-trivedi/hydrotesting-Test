import json
from datetime import date, timedelta
from pathlib import Path

from app.config import settings
from app.database import engine, SessionLocal, Base
from app.models.site import Site
from app.models.asset import Asset
from app.models.hydrotest import HydrotestRecord
from app.models.document import Document
from app.models.audit import AuditLog


def _escape_pdf_text(value: str) -> str:
    """
    Escape characters that have special meaning inside a PDF text string.
    """
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def create_sample_pdf(
    filepath: Path,
    cert_number: str,
    asset_id: str,
    result: str,
):
    """
    Creates a synthetic/demo PDF report.

    IMPORTANT:
    This is NOT an official PESO certificate.
    It is only demonstration data for the FuelFlux assignment.
    """

    lines = [
        "DEMO HYDROSTATIC TEST REPORT",
        "SYNTHETIC DATA - NOT AN OFFICIAL CERTIFICATE",
        f"Certificate No: {cert_number}",
        f"Asset ID: {asset_id}",
        f"Inspection Result: {result}",
        "Demo Testing Laboratory",
        "FuelFlux Assignment Demonstration",
    ]

    commands = [
        "BT",
        "/F1 20 Tf",
        "72 720 Td",
        f"({_escape_pdf_text(lines[0])}) Tj",
        "/F1 11 Tf",
    ]

    y_positions = [680, 650, 620, 590, 560, 530]

    for index, line in enumerate(lines[1:]):
        commands.append(f"0 -{30 if index == 0 else 30} Td")
        commands.append(f"({_escape_pdf_text(line)}) Tj")

    commands.append("ET")

    stream = "\n".join(commands) + "\n"
    stream_bytes = stream.encode("latin-1", errors="replace")

    objects = []

    # 1 - Catalog
    objects.append(
        "<< /Type /Catalog /Pages 2 0 R >>"
    )

    # 2 - Pages
    objects.append(
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"
    )

    # 3 - Page
    objects.append(
        "<< /Type /Page "
        "/Parent 2 0 R "
        "/MediaBox [0 0 612 792] "
        "/Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>"
    )

    # 4 - Content stream
    objects.append(
        f"<< /Length {len(stream_bytes)} >>\n"
        f"stream\n"
        f"{stream}"
        f"endstream"
    )

    # 5 - Font
    objects.append(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    )

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]

    for object_number, object_body in enumerate(objects, start=1):
        offsets.append(len(pdf))

        pdf.extend(
            f"{object_number} 0 obj\n".encode("latin-1")
        )
        pdf.extend(
            object_body.encode("latin-1", errors="replace")
        )
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)

    pdf.extend(
        f"xref\n0 {len(objects) + 1}\n".encode("latin-1")
    )

    pdf.extend(
        b"0000000000 65535 f \n"
    )

    for offset in offsets[1:]:
        pdf.extend(
            f"{offset:010d} 00000 n \n".encode("latin-1")
        )

    pdf.extend(
        (
            f"trailer\n"
            f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n"
            f"{xref_offset}\n"
            f"%%EOF\n"
        ).encode("latin-1")
    )

    with open(filepath, "wb") as file:
        file.write(pdf)


def seed():
    print("Rebuilding database schema...")

    # This seed script intentionally rebuilds the local
    # synthetic/demo database from scratch.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    upload_dir = settings.DOCUMENT_STORAGE_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()

    try:
        today = date.today()

        print(f"Current reference date: {today}")

        # ==========================================================
        # 1. CREATE SITES
        # ==========================================================

        sites = [
            Site(
                code="STN-AHD-01",
                name="Ahmedabad Demo CNG Station",
                city="Ahmedabad",
                state="Gujarat",
            ),
            Site(
                code="STN-SRT-02",
                name="Surat Demo Gas Station",
                city="Surat",
                state="Gujarat",
            ),
            Site(
                code="STN-RJK-03",
                name="Rajkot Demo Inspection Hub",
                city="Rajkot",
                state="Gujarat",
            ),
            Site(
                code="STN-VAD-04",
                name="Vadodara Demo Gas Hub",
                city="Vadodara",
                state="Gujarat",
            ),
        ]

        db.add_all(sites)
        db.commit()

        for site in sites:
            db.refresh(site)

        print(f"Seeded {len(sites)} demo stations.")

        # ==========================================================
        # 2. CREATE ASSETS
        #
        # Total assets = 9
        #
        # Compliance coverage:
        #   VALID       = 2
        #   DUE_SOON    = 2
        #   OVERDUE     = 2
        #   FAILED      = 1
        #   PENDING     = 2
        #
        # Total hydrotests = 12
        # ==========================================================

        assets_data = [

            # ------------------------------------------------------
            # 1. VALID - Stationary Cascade
            # ------------------------------------------------------
            {
                "asset": Asset(
                    asset_id="CNG-CAS-AHD-001",
                    site_id=sites[0].id,
                    asset_type="CASCADE_STORAGE",
                    serial_number="SN-CAS-99401",
                    manufacturer="Demo Heavy Tanks Ltd",
                    model="Cascade Type-1 3000L Bank",
                    capacity_liters=3000.0,
                    installation_date=today - timedelta(days=700),
                    cylinder_number="BNK-AHD-C1-88",
                    status="ACTIVE",
                ),
                "tests": [
                    # Historical test
                    {
                        "test_date": today - timedelta(days=2500),
                        "next_due_date": today - timedelta(days=675),
                        "result": "PASS",
                        "performed_by": "Demo Pressure Testing Lab",
                        "cert": "DEMO-AHD-2020-0001",
                        "verification": "NOT_VERIFIED",
                        "test_p": 340.0,
                        "work_p": 250.0,
                        "notes": "Historical demonstration test record.",
                    },

                    # Current/latest test
                    {
                        "test_date": today - timedelta(days=650),
                        "next_due_date": today
                        - timedelta(days=650)
                        + timedelta(days=1825),
                        "result": "PASS",
                        "performed_by": "Demo Pressure Testing Lab",
                        "cert": "DEMO-AHD-2026-8841",
                        "verification": "NOT_VERIFIED",
                        "test_p": 350.0,
                        "work_p": 250.0,
                        "notes": "Synthetic demonstration test. Result PASS.",
                    },
                ],
            },

            # ------------------------------------------------------
            # 2. VALID - Vehicle CNG Cylinder
            # ------------------------------------------------------
            {
                "asset": Asset(
                    asset_id="CNG-VEH-AHD-002",
                    site_id=sites[0].id,
                    asset_type="VEHICLE_CYLINDER",
                    serial_number="SN-CYL-88219",
                    manufacturer="Demo Cylinder Manufacturing Ltd",
                    model="Type 1 CNG 60L",
                    capacity_liters=60.0,
                    installation_date=today - timedelta(days=400),
                    cylinder_number="CYL-88219",
                    vehicle_number="GJ01AB1234",
                    vehicle_make="Demo Motors",
                    vehicle_model="Demo Hatchback CNG",
                    vehicle_fuel_type="CNG / Petrol",
                    vehicle_verified=True,
                    status="ACTIVE",
                ),
                "tests": [
                    # Older historical test
                    {
                        "test_date": today - timedelta(days=2200),
                        "next_due_date": today - timedelta(days=375),
                        "result": "PASS",
                        "performed_by": "Demo CNG Testing Hub",
                        "cert": "DEMO-AHD-2020-0022",
                        "verification": "NOT_VERIFIED",
                        "test_p": 330.0,
                        "work_p": 200.0,
                        "notes": "Historical synthetic test record.",
                    },

                    # Previous test
                    {
                        "test_date": today - timedelta(days=1100),
                        "next_due_date": today
                        - timedelta(days=1100)
                        + timedelta(days=1095),
                        "result": "PASS",
                        "performed_by": "Demo CNG Testing Hub",
                        "cert": "DEMO-AHD-2023-0022",
                        "verification": "NOT_VERIFIED",
                        "test_p": 335.0,
                        "work_p": 200.0,
                        "notes": "Previous synthetic cylinder certification record.",
                    },

                    # Latest test
                    {
                        "test_date": today - timedelta(days=100),
                        "next_due_date": today
                        - timedelta(days=100)
                        + timedelta(days=1095),
                        "result": "PASS",
                        "performed_by": "Demo Gas Inspection Center",
                        "cert": "DEMO-AHD-2026-1102",
                        "verification": "NOT_VERIFIED",
                        "test_p": 340.0,
                        "work_p": 200.0,
                        "notes": "Latest synthetic retest passed successfully.",
                    },
                ],
            },

            # ------------------------------------------------------
            # 3. DUE SOON - Vehicle CNG Cylinder
            # ------------------------------------------------------
            {
                "asset": Asset(
                    asset_id="CNG-VEH-SRT-003",
                    site_id=sites[1].id,
                    asset_type="VEHICLE_CYLINDER",
                    serial_number="SN-CYL-77402",
                    manufacturer="Demo Cylinder Manufacturing Ltd",
                    model="Type-1 65L CNG",
                    capacity_liters=65.0,
                    installation_date=today - timedelta(days=1083),
                    cylinder_number="CYL-77402",
                    vehicle_number="GJ05EF9012",
                    vehicle_make="Demo Motors",
                    vehicle_model="Demo Compact CNG",
                    vehicle_fuel_type="CNG / Petrol",
                    vehicle_verified=True,
                    status="ACTIVE",
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=1083),
                        "next_due_date": today + timedelta(days=12),
                        "result": "PASS",
                        "performed_by": "Demo Surat Testing Laboratory",
                        "cert": "DEMO-SRT-2026-9912",
                        "verification": "NOT_VERIFIED",
                        "test_p": 335.0,
                        "work_p": 200.0,
                        "notes": "Synthetic test passed. Follow-up due soon.",
                    }
                ],
            },

            # ------------------------------------------------------
            # 4. DUE SOON - Station Dispenser Buffer
            # ------------------------------------------------------
            {
                "asset": Asset(
                    asset_id="CNG-BUF-VAD-004",
                    site_id=sites[3].id,
                    asset_type="DISPENSER_BUFFER",
                    serial_number="SN-BUF-33910",
                    manufacturer="Demo Pressure Equipment Ltd",
                    model="500L Fast-Fill Buffer Vessel",
                    capacity_liters=500.0,
                    installation_date=today - timedelta(days=1801),
                    cylinder_number="BUF-VAD-B2",
                    status="ACTIVE",
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=1801),
                        "next_due_date": today + timedelta(days=24),
                        "result": "PASS",
                        "performed_by": "Demo Vadodara Industrial Lab",
                        "cert": "DEMO-VAD-2026-7781",
                        "verification": "NOT_VERIFIED",
                        "test_p": 375.0,
                        "work_p": 250.0,
                        "notes": "Synthetic buffer vessel inspection valid and due soon.",
                    }
                ],
            },

            # ------------------------------------------------------
            # 5. OVERDUE - Commercial Cab Cylinder
            # ------------------------------------------------------
            {
                "asset": Asset(
                    asset_id="CNG-VEH-RJK-005",
                    site_id=sites[2].id,
                    asset_type="VEHICLE_CYLINDER",
                    serial_number="SN-CYL-11045",
                    manufacturer="Demo Cylinder Manufacturing Ltd",
                    model="Type-1 Light Cylinder 55L",
                    capacity_liters=55.0,
                    installation_date=today - timedelta(days=1110),
                    cylinder_number="CYL-11045",
                    vehicle_number="GJ06GH3456",
                    vehicle_make="Demo Auto",
                    vehicle_model="Demo Cargo CNG",
                    vehicle_fuel_type="CNG",
                    vehicle_verified=True,
                    status="ACTIVE",
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=1110),
                        "next_due_date": today - timedelta(days=15),
                        "result": "PASS",
                        "performed_by": "Demo Rajkot Cylinder Testing Unit",
                        "cert": "DEMO-RJK-2026-9944",
                        "verification": "NOT_VERIFIED",
                        "test_p": 330.0,
                        "work_p": 200.0,
                        "notes": "Synthetic test is overdue. Follow-up action required.",
                    }
                ],
            },

            # ------------------------------------------------------
            # 6. OVERDUE - Cascade Storage
            # ------------------------------------------------------
            {
                "asset": Asset(
                    asset_id="CNG-CAS-SRT-006",
                    site_id=sites[1].id,
                    asset_type="CASCADE_STORAGE",
                    serial_number="SN-CAS-55120",
                    manufacturer="Demo Storage Systems",
                    model="High Pressure 4500L Storage",
                    capacity_liters=4500.0,
                    installation_date=today - timedelta(days=1870),
                    cylinder_number="CAS-SRT-04",
                    status="ACTIVE",
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=1870),
                        "next_due_date": today - timedelta(days=45),
                        "result": "PASS",
                        "performed_by": "Demo Surat Pressure Lab",
                        "cert": "DEMO-SRT-2026-3321",
                        "verification": "NOT_VERIFIED",
                        "test_p": 350.0,
                        "work_p": 250.0,
                        "notes": "Synthetic cascade record is overdue for re-testing.",
                    }
                ],
            },

            # ------------------------------------------------------
            # 7. FAILED - Bus Cylinder
            # ------------------------------------------------------
            {
                "asset": Asset(
                    asset_id="CNG-VEH-AHD-007",
                    site_id=sites[0].id,
                    asset_type="VEHICLE_CYLINDER",
                    serial_number="SN-CYL-90012",
                    manufacturer="Demo Cylinder Manufacturing Ltd",
                    model="Type-1 120L Commercial",
                    capacity_liters=120.0,
                    installation_date=today - timedelta(days=365),
                    cylinder_number="CYL-90012",
                    vehicle_number="GJ27JK7890",
                    vehicle_make="Demo Bus Manufacturer",
                    vehicle_model="Demo CNG Bus",
                    vehicle_fuel_type="CNG",
                    vehicle_verified=True,
                    status="ACTIVE",
                ),
                "tests": [
                    {
                        "test_date": today - timedelta(days=20),
                        "next_due_date": today - timedelta(days=20),
                        "result": "FAIL",
                        "performed_by": "Demo Vehicle Cylinder Laboratory",
                        "cert": "DEMO-AHD-2026-4450",
                        "verification": "NOT_VERIFIED",
                        "test_p": 320.0,
                        "work_p": 200.0,
                        "notes": "Synthetic failed test. Asset requires follow-up and review.",
                    }
                ],
            },

            # ------------------------------------------------------
            # 8. PENDING - Newly Commissioned Asset
            # ------------------------------------------------------
            {
                "asset": Asset(
                    asset_id="CNG-PIP-VAD-008",
                    site_id=sites[3].id,
                    asset_type="PIPELINE_HEADER",
                    serial_number="SN-PIP-44810",
                    manufacturer="Demo Pipeline Systems",
                    model="High Pressure 8-inch Manifold",
                    capacity_liters=800.0,
                    installation_date=today - timedelta(days=5),
                    cylinder_number="PIP-HDR-01",
                    status="ACTIVE",
                ),
                "tests": [],
            },

            # ------------------------------------------------------
            # 9. PENDING - Vehicle with Pending Test
            # ------------------------------------------------------
            {
                "asset": Asset(
                    asset_id="CNG-VEH-RJK-009",
                    site_id=sites[2].id,
                    asset_type="VEHICLE_CYLINDER",
                    serial_number="SN-CYL-66104",
                    manufacturer="Demo Cylinder Manufacturing Ltd",
                    model="Type-1 60L",
                    capacity_liters=60.0,
                    installation_date=today - timedelta(days=30),
                    cylinder_number="CYL-66104",
                    vehicle_number="DL01XY9876",
                    vehicle_make="Demo Motors",
                    vehicle_model="Demo Utility CNG",
                    vehicle_fuel_type="CNG / Petrol",
                    vehicle_verified=True,
                    status="ACTIVE",
                ),
                "tests": [
                    # Historical test
                    {
                        "test_date": today - timedelta(days=1200),
                        "next_due_date": today - timedelta(days=105),
                        "result": "PASS",
                        "performed_by": "Demo Rajkot Testing Facility",
                        "cert": "DEMO-RJK-2023-0009",
                        "verification": "NOT_VERIFIED",
                        "test_p": 330.0,
                        "work_p": 200.0,
                        "notes": "Historical synthetic hydrotest record.",
                    },

                    # Latest pending test
                    {
                        "test_date": today - timedelta(days=2),
                        "next_due_date": today + timedelta(days=1095),
                        "result": "PENDING",
                        "performed_by": "Demo Rajkot Testing Facility",
                        "cert": "DEMO-RJK-2026-0009",
                        "verification": "NOT_VERIFIED",
                        "test_p": 330.0,
                        "work_p": 200.0,
                        "notes": "Synthetic record. Test process is currently pending.",
                    },
                ],
            },
        ]

        # ==========================================================
        # 3. INSERT ASSETS + HYDROTESTS + DOCUMENTS
        # ==========================================================

        total_hydrotests = 0
        total_documents = 0

        for item in assets_data:

            asset = item["asset"]

            db.add(asset)
            db.commit()
            db.refresh(asset)

            for test in item["tests"]:

                # --------------------------------------------------
                # Generate synthetic demo PDF
                # --------------------------------------------------

                filename = f"certificate_{test['cert']}.pdf"
                pdf_path = upload_dir / filename

                create_sample_pdf(
                    pdf_path,
                    test["cert"],
                    asset.asset_id,
                    test["result"],
                )

                # --------------------------------------------------
                # Create Hydrotest Record
                # --------------------------------------------------

                record = HydrotestRecord(
                    asset_id=asset.id,
                    test_date=test["test_date"],
                    performed_by=test["performed_by"],
                    result=test["result"],
                    test_pressure_bar=test["test_p"],
                    working_pressure_bar=test["work_p"],
                    next_due_date=test["next_due_date"],
                    certificate_number=test["cert"],
                    cylinder_number=asset.cylinder_number,
                    notes=test["notes"],
                    report_filename=filename,
                    verification_status=test["verification"],
                    verification_payload=json.dumps(
                        {
                            "seeded": True,
                            "synthetic": True,
                            "cert": test["cert"],
                            "source": "DEMO_DATA",
                        }
                    ),
                )

                db.add(record)
                db.commit()
                db.refresh(record)

                total_hydrotests += 1

                # --------------------------------------------------
                # Create Document Reference
                # --------------------------------------------------

                document = Document(
                    hydrotest_record_id=record.id,
                    filename=filename,
                    original_name=f"{test['cert']}_Demo_Report.pdf",
                    mime_type="application/pdf",
                    file_size=pdf_path.stat().st_size,
                    file_path=str(pdf_path),
                )

                db.add(document)
                db.commit()

                total_documents += 1

        # ==========================================================
        # 4. FINAL SUMMARY
        # ==========================================================

        print()
        print("=" * 60)
        print("DEMO DATABASE SEED COMPLETED")
        print("=" * 60)

        print(f"Sites:           {len(sites)}")
        print(f"Assets:          {len(assets_data)}")
        print(f"Hydrotests:      {total_hydrotests}")
        print(f"Documents:       {total_documents}")

        print()
        print("Compliance coverage:")
        print(" - VALID      (2 assets)")
        print(" - DUE_SOON   (2 assets)")
        print(" - OVERDUE    (2 assets)")
        print(" - FAILED     (1 asset)")
        print(" - PENDING    (2 assets)")

        print()
        print("All generated certificates are:")
        print(" - DEMO DATA")
        print(" - SYNTHETIC")
        print(" - NOT OFFICIAL PESO CERTIFICATES")

        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    seed()
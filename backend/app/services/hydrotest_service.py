import json
from datetime import date
from typing import Optional, Dict, Any
from app.schemas.hydrotest import CertificateVerificationResult

# Mock PESO & Authorized Cylinder Testing Agency Registry
AUTHORIZED_CERTIFICATE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "PESO-GJ-2024-8841": {
        "certificate_number": "PESO-GJ-2024-8841",
        "cylinder_number": "CYL-77402",
        "test_date": "2024-04-15",
        "next_due_date": "2027-04-14",
        "result": "PASS",
        "testing_station": "Gujarat Gas Testing Agency #4",
        "accreditation_id": "PESO-STN-GUJ-044",
        "test_pressure_bar": 335.0
    },
    "PESO-GJ-2023-1102": {
        "certificate_number": "PESO-GJ-2023-1102",
        "cylinder_number": "CYL-88219",
        "test_date": "2023-10-10",
        "next_due_date": "2026-10-09",
        "result": "PASS",
        "testing_station": "Adani Total Gas Inspection Hub",
        "accreditation_id": "PESO-STN-GUJ-012",
        "test_pressure_bar": 340.0
    },
    "PESO-DL-2021-9944": {
        "certificate_number": "PESO-DL-2021-9944",
        "cylinder_number": "CYL-11045",
        "test_date": "2021-08-01",
        "next_due_date": "2024-07-31",
        "result": "PASS",
        "testing_station": "Indraprastha Gas Cylinder Testing Unit",
        "accreditation_id": "PESO-STN-DL-003",
        "test_pressure_bar": 330.0
    },
    "PESO-MH-2024-4450": {
        "certificate_number": "PESO-MH-2024-4450",
        "cylinder_number": "CYL-90012",
        "test_date": "2024-02-14",
        "next_due_date": "2024-02-14",
        "result": "FAIL",
        "testing_station": "Mahanagar Gas Hydro Testing Center",
        "accreditation_id": "PESO-STN-MH-019",
        "test_pressure_bar": 320.0,
        "failure_reason": "Permanent volumetric expansion exceeded 10% limit"
    }
}

class ExternalHydrotestService:
    @classmethod
    def verify_certificate(
        cls,
        certificate_number: str,
        cylinder_number: Optional[str],
        test_date: date,
        result: str,
        performed_by: str
    ) -> CertificateVerificationResult:
        """
        Verifies certificate against authorized testing station / PESO registry records.
        Yields VERIFIED, MISMATCH, or UNAVAILABLE.
        """
        cert_key = certificate_number.strip().upper()
        
        # Check if present in registry
        if cert_key not in AUTHORIZED_CERTIFICATE_REGISTRY:
            # If not in registry database
            return CertificateVerificationResult(
                hydrotest_id=0,
                verification_status="UNAVAILABLE",
                is_match=False,
                authority_name="PESO / Accredited Testing Station Registry",
                matched_records=None,
                mismatches=["Certificate not found in online centralized registry."],
                message="External certificate verification unavailable or certificate not registered online. Record saved locally."
            )

        reg_data = AUTHORIZED_CERTIFICATE_REGISTRY[cert_key]
        mismatches = []

        # Check cylinder number
        if cylinder_number and reg_data.get("cylinder_number"):
            if cylinder_number.strip().upper() != reg_data["cylinder_number"].upper():
                mismatches.append(
                    f"Cylinder number mismatch: Record has '{cylinder_number}', registry has '{reg_data['cylinder_number']}'"
                )

        # Check test date
        rec_date_str = test_date.isoformat()
        if reg_data.get("test_date") and reg_data["test_date"] != rec_date_str:
            mismatches.append(
                f"Test date mismatch: Record has '{rec_date_str}', registry has '{reg_data['test_date']}'"
            )

        # Check result
        if reg_data.get("result") and reg_data["result"].upper() != result.upper():
            mismatches.append(
                f"Test outcome mismatch: Record states '{result}', registry records '{reg_data['result']}'"
            )

        if mismatches:
            return CertificateVerificationResult(
                hydrotest_id=0,
                verification_status="MISMATCH",
                is_match=False,
                authority_name="PESO / Accredited Testing Station Registry",
                matched_records=reg_data,
                mismatches=mismatches,
                message=f"Discrepancy detected between internal record and authorized registry ({len(mismatches)} mismatch(es))."
            )

        return CertificateVerificationResult(
            hydrotest_id=0,
            verification_status="VERIFIED",
            is_match=True,
            authority_name="PESO / Accredited Testing Station Registry",
            matched_records=reg_data,
            mismatches=[],
            message="Certificate details match authorized PESO testing station record perfectly."
        )

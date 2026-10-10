import re
import httpx
from app.config import settings
from app.schemas.verification import VehicleDetails, VehicleLookupResponse


# Synthetic/demo vehicle registry used only for assignment testing.
# These are fictional/demo records and are NOT live VAHAN data.
MOCK_VEHICLE_DATABASE = {
    "GJ01AB1234": {
        "make": "Maruti Suzuki",
        "model": "WagonR 1.0 LXI CNG",
        "fuel_type": "CNG / Petrol",
        "is_cng": True,
        "registration_date": "2021-04-12",
        "fitness_valid_upto": "2036-04-11",
        "owner_category": "Commercial Taxi",
        "rto_location": "RTO Ahmedabad (GJ-01)"
    },
    "GJ01CD5678": {
        "make": "Hyundai",
        "model": "Aura 1.2 Bi-Fuel CNG",
        "fuel_type": "CNG / Petrol",
        "is_cng": True,
        "registration_date": "2022-08-20",
        "fitness_valid_upto": "2037-08-19",
        "owner_category": "Private Vehicle",
        "rto_location": "RTO Ahmedabad (GJ-01)"
    },
    "GJ05EF9012": {
        "make": "Tata Motors",
        "model": "Tiago iCNG XT",
        "fuel_type": "CNG / Petrol",
        "is_cng": True,
        "registration_date": "2023-01-15",
        "fitness_valid_upto": "2038-01-14",
        "owner_category": "Private Vehicle",
        "rto_location": "RTO Surat (GJ-05)"
    },
    "GJ06GH3456": {
        "make": "Bajaj Auto",
        "model": "Maxima C CNG Cargo Auto",
        "fuel_type": "CNG",
        "is_cng": True,
        "registration_date": "2020-11-05",
        "fitness_valid_upto": "2027-11-04",
        "owner_category": "Light Goods Carrier",
        "rto_location": "RTO Vadodara (GJ-06)"
    },
    "GJ27JK7890": {
        "make": "Tata Motors",
        "model": "Starbus CNG 32 Seater",
        "fuel_type": "CNG",
        "is_cng": True,
        "registration_date": "2019-06-10",
        "fitness_valid_upto": "2027-06-09",
        "owner_category": "Public Passenger Bus",
        "rto_location": "RTO Ahmedabad East (GJ-27)"
    },
    "DL01XY9876": {
        "make": "Maruti Suzuki",
        "model": "Eeco 5 STR AC CNG",
        "fuel_type": "CNG / Petrol",
        "is_cng": True,
        "registration_date": "2021-09-18",
        "fitness_valid_upto": "2036-09-17",
        "owner_category": "Commercial Cab",
        "rto_location": "RTO Delhi Central (DL-01)"
    },
    "MH12AB4321": {
        "make": "Honda",
        "model": "City 1.5 i-VTEC Petrol",
        "fuel_type": "Petrol",
        "is_cng": False,
        "registration_date": "2020-03-25",
        "fitness_valid_upto": "2035-03-24",
        "owner_category": "Private Vehicle",
        "rto_location": "RTO Pune (MH-12)"
    }
}


class ExternalVehicleService:

    @staticmethod
    def normalize_plate(plate: str) -> str:
        """Strip spaces, dashes and convert to uppercase."""
        return re.sub(r"[^A-Za-z0-9]", "", plate).upper()

    @classmethod
    async def lookup_vehicle(cls, vehicle_number: str) -> VehicleLookupResponse:
        cleaned_plate = cls.normalize_plate(vehicle_number)

        # Indian license plate basic syntax validation
        if not re.match(
            r"^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$",
            cleaned_plate
        ):
            return VehicleLookupResponse(
                success=False,
                data=None,
                source="SYNTAX_VALIDATOR",
                message=(
                    f"Invalid vehicle registration plate format: "
                    f"'{vehicle_number}'. Example: 'GJ01AB1234'"
                )
            )

        # 1. Live external vehicle API
        # Enabled only when a real API URL is configured and
        # MOCK_EXTERNAL_APIS is False.
        if settings.VEHICLE_API_URL and not settings.MOCK_EXTERNAL_APIS:
            try:
                headers = {}

                if settings.VEHICLE_API_KEY:
                    headers["Authorization"] = (
                        f"Bearer {settings.VEHICLE_API_KEY}"
                    )

                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(
                        f"{settings.VEHICLE_API_URL.rstrip('/')}/lookup/{cleaned_plate}",
                        headers=headers
                    )

                if resp.status_code == 200:
                    payload = resp.json()

                    details = VehicleDetails(
                        vehicle_number=cleaned_plate,
                        make=payload.get("make", "Unknown"),
                        model=payload.get("model", "Unknown"),
                        fuel_type=payload.get("fuel_type", "Unknown"),
                        is_cng="CNG" in payload.get("fuel_type", "").upper(),
                        registration_date=payload.get("registration_date"),
                        fitness_valid_upto=payload.get("fitness_valid_upto"),
                        owner_category=payload.get("owner_category"),
                        rto_location=payload.get("rto_location")
                    )

                    return VehicleLookupResponse(
                        success=True,
                        data=details,
                        source="VAHAN_LIVE_API",
                        message="Vehicle data retrieved from configured live vehicle API."
                    )

                if resp.status_code == 404:
                    return VehicleLookupResponse(
                        success=False,
                        data=None,
                        source="VAHAN_LIVE_API",
                        message=(
                            f"Vehicle registration '{cleaned_plate}' "
                            "was not found in the live vehicle registry."
                        )
                    )

                return VehicleLookupResponse(
                    success=False,
                    data=None,
                    source="VAHAN_LIVE_API",
                    message=(
                        f"Vehicle service returned HTTP "
                        f"{resp.status_code}. Please try again later."
                    )
                )

            except (httpx.RequestError, httpx.TimeoutException):
                return VehicleLookupResponse(
                    success=False,
                    data=None,
                    source="VAHAN_LIVE_API",
                    message=(
                        "Vehicle service is temporarily unavailable. "
                        "Please try again later or use the demo registry."
                    )
                )

        # 2. Synthetic/demo registry lookup
        if cleaned_plate in MOCK_VEHICLE_DATABASE:
            raw = MOCK_VEHICLE_DATABASE[cleaned_plate]

            details = VehicleDetails(
                vehicle_number=cleaned_plate,
                make=raw["make"],
                model=raw["model"],
                fuel_type=raw["fuel_type"],
                is_cng=raw["is_cng"],
                registration_date=raw["registration_date"],
                fitness_valid_upto=raw["fitness_valid_upto"],
                owner_category=raw["owner_category"],
                rto_location=raw["rto_location"]
            )

            cng_label = (
                "CNG vehicle identified in demo registry."
                if raw["is_cng"]
                else "Non-CNG vehicle identified in demo registry."
            )

            return VehicleLookupResponse(
                success=True,
                data=details,
                source="DEMO_SYNTHETIC_REGISTRY",
                message=(
                    f"Vehicle found in the synthetic demo registry. "
                    f"{cng_label}"
                )
            )

        # 3. Unknown vehicle in demo mode
        # IMPORTANT:
        # Never invent or simulate vehicle information for an unknown plate.
        return VehicleLookupResponse(
            success=False,
            data=None,
            source="DEMO_SYNTHETIC_REGISTRY",
            message=(
                f"Vehicle registration '{cleaned_plate}' was not found "
                "in the demo registry."
            )
        )
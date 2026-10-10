class ReportGenerator:
    @staticmethod
    def generate_assessment_report(block_id: int) -> dict:
        return {
            "block_id": block_id,
            "status": "report generated",
            "pdf_url": f"/api/v1/reports/{block_id}/download"
        }

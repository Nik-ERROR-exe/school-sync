from fastapi import HTTPException, status

class ResourceNotFoundException(HTTPException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} with id {identifier} not found"
        )

class ConflictException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail
        )

class CredentialsException(HTTPException):
    def __init__(self, detail: str = "Incorrect credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )

class ForbiddenException(HTTPException):
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )

class ValidationException(HTTPException):
    def __init__(self, detail: str = "Validation error", details: list = None):
        payload = {"message": detail}
        if details:
            payload["issues"] = [
                {
                    "step": i.step,
                    "field": i.field,
                    "message": i.message,
                    "severity": i.severity,
                    "suggestion": getattr(i, "suggestion", ""),
                    "redirect_step": getattr(i, "redirect_step", i.step),
                    "highlight_field": getattr(i, "highlight_field", ""),
                    "class_id": i.class_id,
                    "subject_id": i.subject_id,
                    "teacher_id": i.teacher_id,
                }
                for i in details
            ]
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=payload
        )
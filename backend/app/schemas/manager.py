from pydantic import BaseModel


class EmployeeMetrics(BaseModel):
    id: str
    full_name: str
    email: str
    sessions_count: int
    avg_stress_score: float
    avg_productivity: float
    simulation_hours: float
    difficulty_score: int
    performance_bar: int


class TeamOverview(BaseModel):
    id: str
    name: str
    avg_stress_score: float
    avg_fatigue: float
    avg_cognitive_load: float
    avg_productivity: float
    simulation_hours: float
    employees: list[EmployeeMetrics]


class ManagerOverviewResponse(BaseModel):
    teams: list[TeamOverview]
    struggling_employees: list[EmployeeMetrics]
    total_employees: int
    total_simulation_hours: float
    total_sessions: int

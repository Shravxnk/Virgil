from app.llm.explainer import generate_scenario_from_description
import json
result = generate_scenario_from_description(
    'A retired teacher in Bhopal whose account was hacked overnight. '
    'Attacker transferred 12 lakh RTGS at 2 AM to an unknown mule account in West Bengal '
    'from an unregistered device on a suspicious IP.'
)
print(json.dumps(result, indent=2))

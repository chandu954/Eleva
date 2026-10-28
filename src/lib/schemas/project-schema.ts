export const openAiProjectSchema = {
  "name": "project-schema",
  "schema": {
    "type": "object",
    "properties": {
      "points": {
        "type": "array",
        "description": "A collection of bullet points describing project achievements or features.",
        "items": {
          "type": "string",
          "description": "A bullet point describing a project achievement or feature."
        }
      },
      "analysis": {
        "type": "object",
        "description": "An analysis of the project achievements.",
        "properties": {
          "impact_score": {
            "type": "number",
            "description": "Score indicating the overall impact of these achievements (1-10)."
          },
          "improvement_suggestions": {
            "type": "array",
            "description": "Suggestions for improvement based on the analysis.",
            "items": {
              "type": "string",
              "description": "A suggestion for improvement."
            }
          }
        },
        "required": [
          "impact_score",
          "improvement_suggestions"
        ],
        "additionalProperties": false
      }
    },
    "required": [
      "points",
      "analysis"
    ],
    "additionalProperties": false
  },
  "strict": true
} as const;

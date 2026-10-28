export const openAiWorkExperienceSchema = {
  "name": "WorkExperience",
  "schema": {
    "type": "object",
    "properties": {
      "work_experience_items": {
        "type": "array",
        "description": "A list of work experience items.",
        "items": {
          "type": "object",
          "properties": {
            "company": {
              "type": "string",
              "description": "The name of the company where the work experience took place."
            },
            "position": {
              "type": "string",
              "description": "The job title or position held during the work experience."
            },
            "location": {
              "type": "string",
              "description": "The location of the company."
            },
            "date": {
              "type": "string",
              "description": "The date or period during which the work experience occurred."
            },
            "description": {
              "type": "array",
              "description": "A list of responsibilities and achievements during the work experience.",
              "items": {
                "type": "string"
              }
            },
            "technologies": {
              "type": "array",
              "description": "A list of technologies used during the work experience.",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "company",
            "position",
            "location",
            "date",
            "description",
            "technologies"
          ],
          "additionalProperties": false
        }
      }
    },
    "required": [
      "work_experience_items"
    ],
    "additionalProperties": false
  },
  "strict": true
} as const;

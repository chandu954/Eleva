export const openAiProfileSchema = {
  name: "resume-schema",
  schema: {
    type: "object",
    properties: {
      response: {
        type: "string"
      },
      first_name: {
        type: "string"
      },
      last_name: {
        type: "string"
      },
      email: {
        type: "string"
      },
      phone_number: {
        type: "string"
      },
      location: {
        type: "string"
      },
      website: {
        type: "string"
      },
      linkedin_url: {
        type: "string"
      },
      github_url: {
        type: "string"
      },
      work_experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            company: {
              type: "string"
            },
            position: {
              type: "string"
            },
            date: {
              type: "string"
            },
            location: {
              type: "string"
            },
            description: {
              type: "array",
              items: {
                type: "string"
              }
            },
            technologies: {
              type: "array",
              items: {
                type: "string"
              }
            }
          },
          required: [
            "company",
            "position",
            "date",
            "location",
            "description",
            "technologies"
          ],
          additionalProperties: false
        }
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            school: {
              type: "string"
            },
            degree: {
              type: "string"
            },
            field: {
              type: "string"
            },
            date: {
              type: "string"
            },
            location: {
              type: "string"
            },
            gpa: {
              type: "string"
            },
            achievements: {
              type: "array",
              items: {
                type: "string"
              }
            }
          },
          required: [
            "school",
            "degree",
            "field",
            "date",
            "location",
            "gpa",
            "achievements"
          ],
          additionalProperties: false
        }
      },
      skills: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string"
            },
            skills: {
              type: "array",
              items: {
                type: "string"
              }
            }
          },
          required: [
            "category",
            "skills"
          ],
          additionalProperties: false
        }
      },
      projects: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string"
            },
            description: {
                type: "array",
                items: {
                  type: "string"
                }
            },
            date: {
              type: "string"
            },
            url: {
              type: "string"
            },
            technologies: {
              type: "array",
              items: {
                type: "string"
              }
            }
          },
          required: [
            "name",
            "description",
            "date",
            "url",
            "technologies"
          ],
          additionalProperties: false
        }
      },

    },
    required: [
      "response",
      "first_name",
      "last_name",
      "email",
      "phone_number",
      "location",
      "website",
      "linkedin_url",
      "github_url",
      "work_experience",
      "education",
      "skills",
      "projects"
    ],
    additionalProperties: false
  },
  strict: true
} as const;

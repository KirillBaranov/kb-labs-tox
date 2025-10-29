/**
 * JSON Schema for TOX JSON format v1.0
 */
export function getToxJsonSchema() {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    required: ["$schemaVersion", "$meta", "data"],
    properties: {
      $schemaVersion: {
        type: "string",
        enum: ["1.0"],
      },
      $meta: {
        type: "object",
        required: ["generatedAt", "producer"],
        properties: {
          generatedAt: {
            type: "string",
            format: "date-time",
          },
          producer: {
            type: "string",
          },
          preset: {
            type: "string",
          },
        },
        additionalProperties: false,
      },
      $dict: {
        type: "object",
        patternProperties: {
          "^[ksp][0-9]+$": {
            type: "string",
          },
        },
        additionalProperties: false,
      },
      data: {
        description: "The actual data payload",
      },
    },
    additionalProperties: false,
  };
}


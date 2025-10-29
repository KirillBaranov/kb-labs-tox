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
      $pathDict: {
        type: "object",
        patternProperties: {
          "^p[0-9]+$": {
            type: "string",
          },
        },
        additionalProperties: false,
        description: "Path segment dictionary mapping segment IDs to segment strings",
      },
      $shapes: {
        type: "object",
        patternProperties: {
          "^s[0-9]+$": {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        additionalProperties: false,
        description: "Shape dictionary mapping shape IDs to ordered key lists",
      },
      $valDict: {
        type: "object",
        patternProperties: {
          "^v[0-9]+$": {
            description: "Value can be string, number, boolean, or null",
          },
        },
        additionalProperties: false,
        description: "Value dictionary mapping value IDs to scalar values",
      },
      data: {
        description: "The actual data payload",
      },
    },
    additionalProperties: false,
  };
}


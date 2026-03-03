import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SheBloom API',
      version: '1.0.0',
      description: "Women's Health & Wellness Platform REST API",
      contact: { name: 'SheBloom Team', email: 'api@shebloom.in', url: 'https://shebloom.in' },
      license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
    },
    servers: [
      { url: '/api/v1', description: 'API v1' },
      { url: 'https://api.shebloom.in/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Cycles', description: 'Period & cycle tracking' },
      { name: 'Pregnancy', description: 'Pregnancy tracking' },
      { name: 'Doctors', description: 'Doctor directory' },
      { name: 'Hospitals', description: 'Hospital finder' },
      { name: 'Articles', description: 'Health articles' },
      { name: 'Wellness', description: 'Wellness activities' },
      { name: 'Appointments', description: 'Doctor appointments' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export default swaggerJsdoc(options);

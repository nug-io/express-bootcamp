import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

describe('Auth Endpoints', () => {
    let testUser = {
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        phone_number: '08123456789'
    };

    beforeAll(async () => {
        // Optional: clean specific test user if needed, but uniqueness handled by dynamic email
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { email: testUser.email } });
        await prisma.$disconnect();
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send(testUser);

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('data.token');
        expect(res.body.data.user).toHaveProperty('email', testUser.email);
    });

    it('should login the user', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('data.token');
    });

    it('should fail login with wrong password', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({
                email: testUser.email,
                password: 'wrongpassword'
            });

        expect(res.statusCode).toEqual(401);
    });
});

import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { generateToken } from '../src/utils/token.js';

describe('Batch Endpoints', () => {
    let adminToken;
    let userToken;
    let adminId;

    beforeAll(async () => {
        // Create Admin
        const admin = await prisma.user.create({
            data: {
                name: 'Admin User',
                email: `admin${Date.now()}@example.com`,
                password_hash: 'hashedpassword',
                role: 'ADMIN',
            },
        });
        adminId = admin.id;
        adminToken = generateToken({ id: admin.id, role: admin.role });

        // Create User
        const user = await prisma.user.create({
            data: {
                name: 'Regular User',
                email: `user${Date.now()}@example.com`,
                password_hash: 'hashedpassword',
                role: 'USER',
            },
        });
        userToken = generateToken({ id: user.id, role: user.role });
    });

    afterAll(async () => {
        // Clean up
        await prisma.batch.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    it('should create a batch (Admin)', async () => {
        const res = await request(app)
            .post('/batches')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                title: 'Fullstack Bootcamp',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
                price: 5000000,
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.title).toEqual('Fullstack Bootcamp');
    });

    it('should not create a batch (User)', async () => {
        const res = await request(app)
            .post('/batches')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                title: 'Hacker Batch',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
                price: 5000000,
            });

        expect(res.statusCode).toEqual(403);
    });

    it('should get all batches (Public)', async () => {
        const res = await request(app).get('/batches');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body.data)).toBeTruthy();
        expect(res.body.data.length).toBeGreaterThan(0);
    });
});

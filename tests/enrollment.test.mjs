import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { generateToken } from '../src/utils/token.js';

describe('Enrollment Endpoints', () => {
    let userToken;
    let userId;
    let batchId;

    beforeAll(async () => {
        // Create User
        const user = await prisma.user.create({
            data: {
                name: 'Enroll User',
                email: `enroll${Date.now()}@example.com`,
                password_hash: 'hashedpassword',
                role: 'USER',
            },
        });
        userId = user.id;
        userToken = generateToken({ id: user.id, role: user.role });

        // Create Batch
        const batch = await prisma.batch.create({
            data: {
                title: 'Enrollment Batch',
                start_date: new Date(),
                end_date: new Date(),
                price: 1000000,
                status: 'OPEN',
            },
        });
        batchId = batch.id;
    });

    afterAll(async () => {
        await prisma.enrollment.deleteMany();
        await prisma.batch.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    it('should enroll user in a batch', async () => {
        const res = await request(app)
            .post('/enrollment')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                batch_id: batchId,
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.batch_id).toEqual(batchId);
    });

    it('should prevent duplicate enrollment', async () => {
        const res = await request(app)
            .post('/enrollment')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                batch_id: batchId,
            });

        expect(res.statusCode).toEqual(409);
    });

    it('should get user enrollments', async () => {
        const res = await request(app)
            .get('/enrollment/my-enrollments')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body.data)).toBeTruthy();
        expect(res.body.data.length).toBeGreaterThan(0);
    });
});

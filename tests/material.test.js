import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { generateToken } from '../src/utils/token.js';

describe('Material Endpoints', () => {
    let adminToken;
    let userToken;
    let batchId;

    beforeAll(async () => {
        // Admin
        const admin = await prisma.user.create({
            data: {
                name: 'Material Admin',
                email: `m_admin${Date.now()}@example.com`,
                password_hash: 'hashed',
                role: 'ADMIN',
            },
        });
        adminToken = generateToken({ id: admin.id, role: admin.role });

        // User
        const user = await prisma.user.create({
            data: {
                name: 'Material User',
                email: `m_user${Date.now()}@example.com`,
                password_hash: 'hashed',
                role: 'USER',
            },
        });
        userToken = generateToken({ id: user.id, role: user.role });

        // Batch
        const batch = await prisma.batch.create({
            data: {
                title: 'Material Batch',
                start_date: new Date(),
                end_date: new Date(),
                price: 1000,
                status: 'OPEN',
            },
        });
        batchId = batch.id;

        // Enroll User
        await prisma.enrollment.create({
            data: {
                user_id: user.id,
                batch_id: batchId,
            },
        });
    });

    afterAll(async () => {
        await prisma.material.deleteMany();
        await prisma.enrollment.deleteMany();
        await prisma.batch.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    it('should create material (Admin)', async () => {
        const res = await request(app)
            .post('/materials')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                title: 'Intro to Node.js',
                content: '# Node.js Introduction \n This is content.',
                batch_id: batchId,
                order: 1,
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.data.title).toEqual('Intro to Node.js');
    });

    it('should get materials for enrolled user', async () => {
        const res = await request(app)
            .get(`/materials/batch/${batchId}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    });
});

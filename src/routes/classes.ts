import express from "express";
import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";

import {db} from "../db/index.js";
import {classes, departments, enrollments, subjects, user} from "../db/schema/index.js";

const router = express.Router();

// Get all classes with optional search, subject, teacher filters, and pagination
router.get("/", async (req, res) => {
    try {
        const {search, subject, teacher, page = 1, limit = 10} = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        if (search) {
            filterConditions.push(
                or(
                    ilike(classes.name, `%${search}%`),
                    ilike(classes.inviteCode, `%${search}%`)
                )
            );
        }

        if (subject) {
            filterConditions.push(ilike(subjects.name, `%${subject}%`));
        }

        if (teacher) {
            filterConditions.push(ilike(user.name, `%${teacher}%`));
        }

        const whereClause =
            filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({count: sql<number>`count(*)`})
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const classesList = await db
            .select({
                ...getTableColumns(classes),
                subject: {
                    ...getTableColumns(subjects),
                },
                teacher: {
                    ...getTableColumns(user),
                },
            })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause)
            .orderBy(desc(classes.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: classesList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            },
        });
    } catch (error) {
        console.error("GET /classes error:", error);
        res.status(500).json({error: "Failed to fetch classes"});
    }
});

router.post("/", async (req, res) => {
    try {
        const {
            name,
            teacherId,
            subjectId,
            capacity,
            description,
            status,
            bannerUrl,
            bannerCldPubId,
        } = req.body;

        const [createdClass] = await db
            .insert(classes)
            .values({
                subjectId,
                inviteCode: Math.random().toString(36).substring(2, 9),
                name,
                teacherId,
                bannerCldPubId,
                bannerUrl,
                capacity,
                description,
                schedules: [],
                status,
            })
            .returning({id: classes.id});

        if (!createdClass) throw Error;

        res.status(201).json({data: createdClass});
    } catch (error) {
        console.error("POST /classes error:", error);
        res.status(500).json({error: "Failed to create class"});
    }
});

// Update class
router.put("/:id", async (req, res) => {
    try {
        const classId = Number(req.params.id);

        if (!Number.isFinite(classId)) {
            return res.status(400).json({
                error: "Invalid class id",
            });
        }

        const {
            name,
            teacherId,
            subjectId,
            capacity,
            description,
            status,
            bannerUrl,
            bannerCldPubId,
        } = req.body;

        // Validate required fields
        if (
            !name ||
            !teacherId ||
            subjectId === undefined ||
            capacity === undefined ||
            !status
        ) {
            return res.status(400).json({
                error: "Name, teacher, subject, capacity and status are required",
            });
        }

        const parsedSubjectId = Number(subjectId);
        const parsedCapacity = Number(capacity);

        if (!Number.isInteger(parsedSubjectId) || parsedSubjectId <= 0) {
            return res.status(400).json({
                error: "Invalid subject id",
            });
        }

        if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
            return res.status(400).json({
                error: "Capacity must be a positive number",
            });
        }

        // Check class exists
        const [existingClass] = await db
            .select({
                id: classes.id,
            })
            .from(classes)
            .where(eq(classes.id, classId));

        if (!existingClass) {
            return res.status(404).json({
                error: "Class not found",
            });
        }

        // Check teacher exists
        const [teacher] = await db
            .select({
                id: user.id,
                role: user.role,
            })
            .from(user)
            .where(eq(user.id, teacherId));

        if (!teacher) {
            return res.status(400).json({
                error: "Teacher not found",
            });
        }

        // Make sure selected user is a teacher
        if (teacher.role !== "teacher") {
            return res.status(400).json({
                error: "Selected user is not a teacher",
            });
        }

        // Check subject exists
        const [subject] = await db
            .select({
                id: subjects.id,
            })
            .from(subjects)
            .where(eq(subjects.id, parsedSubjectId));

        if (!subject) {
            return res.status(400).json({
                error: "Subject not found",
            });
        }

        // Update class
        const [updatedClass] = await db
            .update(classes)
            .set({
                name,
                teacherId,
                subjectId: parsedSubjectId,
                capacity: parsedCapacity,
                description: description ?? null,
                status,
                bannerUrl: bannerUrl ?? null,
                bannerCldPubId: bannerCldPubId ?? null,
                updatedAt: new Date(),
            })
            .where(eq(classes.id, classId))
            .returning();

        if (!updatedClass) {
            return res.status(404).json({
                error: "Class not found",
            });
        }

        res.status(200).json({
            data: updatedClass,
        });
    } catch (error) {
        console.error("PUT /classes/:id error:", error);

        res.status(500).json({
            error: "Failed to update class",
        });
    }
});

// Delete class
router.delete("/:id", async (req, res) => {
    try {
        const classId = Number(req.params.id);

        if (!Number.isFinite(classId)) {
            return res.status(400).json({
                error: "Invalid class id",
            });
        }

        const [deletedClass] = await db
            .delete(classes)
            .where(eq(classes.id, classId))
            .returning({
                id: classes.id,
            });

        if (!deletedClass) {
            return res.status(404).json({
                error: "Class not found",
            });
        }

        res.status(200).json({
            data: deletedClass,
        });
    } catch (error) {
        console.error("DELETE /classes/:id error:", error);

        res.status(500).json({
            error: "Failed to delete class",
        });
    }
});

// Get class details with counts
router.get("/:id", async (req, res) => {
    try {
        const classId = Number(req.params.id);

        if (!Number.isFinite(classId)) {
            return res.status(400).json({error: "Invalid class id"});
        }

        const [classDetails] = await db
            .select({
                ...getTableColumns(classes),
                subject: {
                    ...getTableColumns(subjects),
                },
                department: {
                    ...getTableColumns(departments),
                },
                teacher: {
                    ...getTableColumns(user),
                },
            })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(eq(classes.id, classId));

        if (!classDetails) {
            return res.status(404).json({error: "Class not found"});
        }

        res.status(200).json({data: classDetails});
    } catch (error) {
        console.error("GET /classes/:id error:", error);
        res.status(500).json({error: "Failed to fetch class details"});
    }
});

// List users in a class by role with pagination
router.get("/:id/users", async (req, res) => {
    try {
        const classId = Number(req.params.id);
        const {role, page = 1, limit = 10} = req.query;

        if (!Number.isFinite(classId)) {
            return res.status(400).json({error: "Invalid class id"});
        }

        if (role !== "teacher" && role !== "student") {
            return res.status(400).json({error: "Invalid role"});
        }

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const baseSelect = {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            role: user.role,
            imageCldPubId: user.imageCldPubId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        const groupByFields = [
            user.id,
            user.name,
            user.email,
            user.emailVerified,
            user.image,
            user.role,
            user.imageCldPubId,
            user.createdAt,
            user.updatedAt,
        ];

        const countResult =
            role === "teacher"
                ? await db
                    .select({
                        count: sql<number>`count(distinct
                        ${user.id}
                        )`
                    })
                    .from(user)
                    .leftJoin(classes, eq(user.id, classes.teacherId))
                    .where(and(eq(user.role, role), eq(classes.id, classId)))
                : await db
                    .select({
                        count: sql<number>`count(distinct
                        ${user.id}
                        )`
                    })
                    .from(user)
                    .leftJoin(enrollments, eq(user.id, enrollments.studentId))
                    .where(and(eq(user.role, role), eq(enrollments.classId, classId)));

        const totalCount = countResult[0]?.count ?? 0;

        const usersList =
            role === "teacher"
                ? await db
                    .select(baseSelect)
                    .from(user)
                    .leftJoin(classes, eq(user.id, classes.teacherId))
                    .where(and(eq(user.role, role), eq(classes.id, classId)))
                    .groupBy(...groupByFields)
                    .orderBy(desc(user.createdAt))
                    .limit(limitPerPage)
                    .offset(offset)
                : await db
                    .select(baseSelect)
                    .from(user)
                    .leftJoin(enrollments, eq(user.id, enrollments.studentId))
                    .where(and(eq(user.role, role), eq(enrollments.classId, classId)))
                    .groupBy(...groupByFields)
                    .orderBy(desc(user.createdAt))
                    .limit(limitPerPage)
                    .offset(offset);

        res.status(200).json({
            data: usersList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            },
        });
    } catch (error) {
        console.error("GET /classes/:id/users error:", error);
        res.status(500).json({error: "Failed to fetch class users"});
    }
});

export default router;
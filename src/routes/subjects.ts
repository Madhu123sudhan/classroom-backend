import express from "express";
import {departments, subjects} from "../db/schema/index.js";
import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";
import {db} from "../db/index.js";

const router = express.Router();

//get all subjects with optional search, filtering and pagination
router.get("/", async (req, res) => {
    try {
        const {search, department, page = 1, limit = 10} = req.query;

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(
            Math.max(1, parseInt(String(limit), 10) || 10),
            100
        ); // Max 100 records per page

        const offset = (currentPage - 1) * limitPerPage;
        const filterConditions = [];

        //if search query exists, filters by subject name OR subject code
        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )
            )
        }
        ;

        //if department filters exists, match department name
        if (department) {
            const deptPattern = `%${String(department).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(ilike(departments.name, deptPattern));
        }

        //combine all filters using AND if any exists
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;
        const countResult = await db
            .select({count: sql<number>`count(*)`.mapWith(Number),})
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0

        const subjectsList = await db
            .select({
                ...getTableColumns(subjects),
                department: {...getTableColumns(departments)}
            }).from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)
            .orderBy(desc(subjects.createdAt), desc(subjects.id))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json(
            {
                data: subjectsList,
                pagination: {
                    page: currentPage,
                    limit: limitPerPage,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limitPerPage),
                }
            }
        )
    } catch (e) {
        console.error(`GET/subjects error: ${e}`);
        res.status(500).json({error: "failed to get subjects"});
    }
});

export default router;


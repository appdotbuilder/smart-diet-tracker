import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  createUserInputSchema,
  createDailyGoalsInputSchema,
  updateDailyGoalsInputSchema,
  createFoodItemInputSchema,
  logFoodInputSchema,
  logFluidInputSchema,
  getUserDailyProgressInputSchema,
  searchFoodItemsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUserById } from './handlers/get_user_by_id';
import { createDailyGoals } from './handlers/create_daily_goals';
import { updateDailyGoals } from './handlers/update_daily_goals';
import { getUserDailyGoals } from './handlers/get_user_daily_goals';
import { createFoodItem } from './handlers/create_food_item';
import { searchFoodItems } from './handlers/search_food_items';
import { getAllFoodItems } from './handlers/get_all_food_items';
import { logFood } from './handlers/log_food';
import { logFluid } from './handlers/log_fluid';
import { getUserDailyProgress } from './handlers/get_user_daily_progress';
import { getUserFoodLogs } from './handlers/get_user_food_logs';
import { getUserFluidLogs } from './handlers/get_user_fluid_logs';
import { deleteFoodLog } from './handlers/delete_food_log';
import { deleteFluidLog } from './handlers/delete_fluid_log';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUserById: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserById(input.userId)),

  // Daily goals management
  createDailyGoals: publicProcedure
    .input(createDailyGoalsInputSchema)
    .mutation(({ input }) => createDailyGoals(input)),

  updateDailyGoals: publicProcedure
    .input(updateDailyGoalsInputSchema)
    .mutation(({ input }) => updateDailyGoals(input)),

  getUserDailyGoals: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserDailyGoals(input.userId)),

  // Food items management
  createFoodItem: publicProcedure
    .input(createFoodItemInputSchema)
    .mutation(({ input }) => createFoodItem(input)),

  searchFoodItems: publicProcedure
    .input(searchFoodItemsInputSchema)
    .query(({ input }) => searchFoodItems(input)),

  getAllFoodItems: publicProcedure
    .query(() => getAllFoodItems()),

  // Food and fluid logging
  logFood: publicProcedure
    .input(logFoodInputSchema)
    .mutation(({ input }) => logFood(input)),

  logFluid: publicProcedure
    .input(logFluidInputSchema)
    .mutation(({ input }) => logFluid(input)),

  // Progress and logs retrieval
  getUserDailyProgress: publicProcedure
    .input(getUserDailyProgressInputSchema)
    .query(({ input }) => getUserDailyProgress(input)),

  getUserFoodLogs: publicProcedure
    .input(z.object({ 
      userId: z.number(), 
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() 
    }))
    .query(({ input }) => getUserFoodLogs(input.userId, input.date)),

  getUserFluidLogs: publicProcedure
    .input(z.object({ 
      userId: z.number(), 
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() 
    }))
    .query(({ input }) => getUserFluidLogs(input.userId, input.date)),

  // Log deletion
  deleteFoodLog: publicProcedure
    .input(z.object({ logId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteFoodLog(input.logId, input.userId)),

  deleteFluidLog: publicProcedure
    .input(z.object({ logId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteFluidLog(input.logId, input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
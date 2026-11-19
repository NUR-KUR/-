import {sqliteTable,text,integer,uniqueIndex,primaryKey,check,index} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const members=sqliteTable('members',{
 id:text('id').primaryKey(),code:text('code').notNull().unique(),nickname:text('nickname').notNull().default('Участник Ultima'),created:text('created').notNull()
});
export const visits=sqliteTable('visits',{
 id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>members.id,{onDelete:'cascade'}),salon:text('salon').notNull(),date:text('date').notNull(),time:text('time').notNull().default(''),services:text('services').notNull(),status:text('status').notNull(),silent:integer('silent').notNull().default(0),private:integer('private').notNull().default(0),notes:text('notes').notNull().default(''),created:text('created').notNull()
},t=>[uniqueIndex('visit_day_unique').on(t.userId,t.salon,t.date),index('visits_owner').on(t.userId),check('visit_status',sql`${t.status} IN ('planned','completed','cancelled')`)]);
export const reviews=sqliteTable('reviews',{
 id:text('id').primaryKey(),visitId:text('visit_id').notNull().unique().references(()=>visits.id,{onDelete:'cascade'}),userId:text('user_id').notNull().references(()=>members.id,{onDelete:'cascade'}),salon:text('salon').notNull(),rating:integer('rating').notNull(),body:text('body').notNull().default(''),created:text('created').notNull(),updated:text('updated').notNull()
},t=>[check('rating_range',sql`${t.rating} BETWEEN 1 AND 5`),index('reviews_salon').on(t.salon)]);
export const favorites=sqliteTable('favorites',{
 userId:text('user_id').notNull().references(()=>members.id,{onDelete:'cascade'}),salon:text('salon').notNull(),created:text('created').notNull()
},t=>[primaryKey({columns:[t.userId,t.salon]})]);

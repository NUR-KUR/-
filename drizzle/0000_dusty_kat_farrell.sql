CREATE TABLE `favorites` (
	`user_id` text NOT NULL,
	`salon` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`user_id`, `salon`),
	FOREIGN KEY (`user_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`nickname` text DEFAULT 'Участник Ultima' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_code_unique` ON `members` (`code`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`visit_id` text NOT NULL,
	`user_id` text NOT NULL,
	`salon` text NOT NULL,
	`rating` integer NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "rating_range" CHECK("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_visit_id_unique` ON `reviews` (`visit_id`);--> statement-breakpoint
CREATE INDEX `reviews_salon` ON `reviews` (`salon`);--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`salon` text NOT NULL,
	`date` text NOT NULL,
	`time` text DEFAULT '' NOT NULL,
	`services` text NOT NULL,
	`status` text NOT NULL,
	`silent` integer DEFAULT 0 NOT NULL,
	`private` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "visit_status" CHECK("visits"."status" IN ('planned','completed','cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visit_day_unique` ON `visits` (`user_id`,`salon`,`date`);--> statement-breakpoint
CREATE INDEX `visits_owner` ON `visits` (`user_id`);
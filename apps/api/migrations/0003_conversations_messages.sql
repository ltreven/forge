CREATE TYPE "counterpart_type" AS ENUM ('human', 'agent', 'external');
CREATE TYPE "message_role" AS ENUM ('user', 'assistant');

CREATE TABLE "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "counterpart_type" "counterpart_type" NOT NULL,
  "counterpart_id" text,
  "counterpart_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role" "message_role" NOT NULL,
  "content" text NOT NULL,
  "token_count" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

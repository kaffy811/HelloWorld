import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
const u1 = "11111111-1111-4111-8111-111111111111",
  u2 = "22222222-2222-4222-8222-222222222222";
const publicId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  privateId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const newsId = "99999999-9999-4999-8999-999999999999";
const uploadId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const run1 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  run2 = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
let passed = 0;
async function check(label, fn) {
  await fn();
  passed++;
  console.log("PASS: " + label);
}
async function role(name, user = "") {
  await db.exec(`reset role; set role ${name};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
}
async function denied(query, args = []) {
  await assert.rejects(db.query(query, args));
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage;
 create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 grant select,insert,update,delete on storage.objects to anon,authenticated;
 grant all on all tables in schema storage to service_role;`);
  for (const file of (await fs.readdir("supabase/migrations")).sort())
    await db.exec(await fs.readFile("supabase/migrations/" + file, "utf8"));
  await check("additional news sources preserve public read and server-only write with matched hosts",async()=>{
   await role("service_role");await db.query("insert into public.market_articles(source_key,title,source,source_url,category,published_at) values('bea:test','GDP','BEA','https://www.bea.gov/news/2026/gdp','market',now()),('alpaca:42','Apple news','Benzinga via Alpaca','https://www.benzinga.com/news/42','company',now())");
   await denied("insert into public.market_articles(source_key,title,source,source_url,category,published_at) values('bea:bad','Bad','BEA','https://www.benzinga.com/news/42','market',now())");
   for(const reader of ['anon','authenticated']){await role(reader);assert.equal((await db.query("select id from public.market_articles")).rows.length,2);await denied("insert into public.market_articles(source_key,title,source,source_url,category,published_at) values('forged','Fake','BEA','https://www.bea.gov/news/forged','market',now())");}
   await db.exec('reset role;');
  });
  await check(
    "repeated migration is rejected before changing the existing schema",
    async () => {
      const repeated = await fs.readFile(
        "supabase/migrations/202610070001_us_news_learning.sql",
        "utf8",
      );
      await assert.rejects(db.exec(repeated), /already present/);
      await db.exec("rollback;");
      assert.equal(
        (await db.query("select count(*)::integer as n from public.companies"))
          .rows[0].n,
        6,
      );
      assert.ok(
        (
          await db.query(
            "select to_regclass('public.analysis_versions') as relation",
          )
        ).rows[0].relation,
      );
    },
  );
  await db.exec(`insert into auth.users values('${u1}'),('${u2}');
 insert into public.learning_uploads(id,owner_id,ticker,storage_path,public_material_confirmed) values('${uploadId}','${u1}','AAPL','${u1}/public-table.webp',true);
 insert into public.generation_runs(id,owner_id,kind,dedupe_key,prompt,status) values('${run1}',null,'news','public-test','{}','completed'),('${run2}','${u1}','material','private-test','{}','completed');
 insert into public.news_items(id,ticker,source_key,title,event_type,source_url,published_at,evidence) values('${newsId}','AAPL','fixture','Test filing','8-K','https://www.sec.gov/Archives/fixture.htm',now(),'[]');
 insert into public.analysis_versions(id,run_id,ticker,news_id,kind,content,evidence,language,data_as_of,is_public) values('${publicId}','${run1}','AAPL','${newsId}','news','{}','[]','en',now(),true);
 insert into public.analysis_versions(id,run_id,ticker,owner_id,kind,upload_id,content,evidence,language,data_as_of) values('${privateId}','${run2}','AAPL','${u1}','material','${uploadId}','{}','[]','en',now());
 insert into storage.objects(bucket_id,name) values('learning-materials','${u1}/public-table.webp');`);
  await check("every application table has RLS enabled", async () => {
    const { rows } = await db.query(
      "select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity",
    );
    assert.equal(rows.length, 0);
  });
  await role("anon");
  await check(
    "anonymous sees public explanation but cannot read private work or prompts",
    async () => {
      assert.equal(
        (await db.query("select id from public.analysis_versions")).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select id from public.news_items")).rows.length,
        1,
      );
      await denied("select * from public.generation_runs");
      await denied("select * from public.learning_uploads");
    },
  );
  await check("anonymous cannot vote or invoke generation", async () => {
    await denied(
      "insert into public.ratings(user_id,analysis_id,value) values($1,$2,1)",
      [u1, publicId],
    );
    await denied(
      "select * from public.reserve_learning_generation(null,'news',$1,'{}',20)",
      ["a".repeat(64)],
    );
  });
  await role("authenticated", u1);
  await check(
    "owner sees private work and can insert one real vote",
    async () => {
      assert.equal(
        (await db.query("select id from public.analysis_versions")).rows.length,
        2,
      );
      await db.query(
        "insert into public.ratings(user_id,analysis_id,value) values($1,$2,1)",
        [u1, publicId],
      );
      assert.equal(
        (await db.query("select * from public.ratings")).rows.length,
        1,
      );
    },
  );
  await check(
    "duplicate voting, forged voter IDs and changing votes fail",
    async () => {
      await denied(
        "insert into public.ratings(user_id,analysis_id,value) values($1,$2,-1)",
        [u1, publicId],
      );
      await denied(
        "insert into public.ratings(user_id,analysis_id,value) values($1,$2,1)",
        [u2, privateId],
      );
      await denied("update public.ratings set value=-1");
      await denied("delete from public.ratings");
    },
  );
  await check(
    "clients cannot forge AI output or generation records",
    async () => {
      await denied(
        "insert into public.generation_runs(owner_id,kind,dedupe_key,prompt) values($1,'material','forged','{}')",
        [u1],
      );
      await denied("update public.analysis_versions set is_public=true");
      await denied(
        "select public.complete_learning_generation($1,'AAPL',null,null,null,'{}','[]','en',now(),'{}')",
        [run2],
      );
    },
  );
  await check(
    "owner can read registered files but cannot upload arbitrary objects",
    async () => {
      assert.equal(
        (await db.query("select * from storage.objects")).rows.length,
        1,
      );
      await denied(
        "insert into storage.objects(bucket_id,name) values('learning-materials',$1)",
        [u1 + "/unregistered.webp"],
      );
    },
  );
  await role("authenticated", u2);
  await check(
    "another member cannot see private cards, source files or another voter",
    async () => {
      assert.equal(
        (await db.query("select id from public.analysis_versions")).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from public.ratings")).rows.length,
        0,
      );
      assert.equal(
        (await db.query("select * from storage.objects")).rows.length,
        0,
      );
      await denied(
        "insert into public.ratings(user_id,analysis_id,value) values($1,$2,1)",
        [u2, privateId],
      );
    },
  );
  await check(
    "anonymous Auth accounts cannot bypass registered-user voting",
    async () => {
      await db.query("select set_config('request.jwt.claims',$1,false)", [
        '{"is_anonymous":true}',
      ]);
      await denied(
        "insert into public.ratings(user_id,analysis_id,value) values($1,$2,1)",
        [u2, publicId],
      );
      await db.query("select set_config('request.jwt.claims','{}',false)");
    },
  );
  await check(
    "public aggregate returns counts but filters private IDs",
    async () => {
      const { rows } = await db.query(
        "select * from public.learning_rating_totals($1::uuid[])",
        [[publicId, privateId]],
      );
      assert.equal(rows.length, 1);
      assert.equal(Number(rows[0].helpful), 1);
    },
  );
  await check(
    "watchlists enforce ownership on inserts, reads and deletes",
    async () => {
      await db.query(
        "insert into public.watchlist(user_id,ticker) values($1,$2)",
        [u2, "MSFT"],
      );
      await denied(
        "insert into public.watchlist(user_id,ticker) values($1,$2)",
        [u1, "MSFT"],
      );
      await role("authenticated", u1);
      assert.equal(
        (await db.query("select * from public.watchlist")).rows.length,
        0,
      );
      await db.query("delete from public.watchlist where user_id=$1", [u2]);
      await role("authenticated", u2);
      assert.equal(
        (await db.query("select * from public.watchlist")).rows.length,
        1,
      );
    },
  );
  await check(
    "only the owner can explicitly publish a public-source material",
    async () => {
      assert.equal(
        (
          await db.query("select public.publish_own_learning($1) as ok", [
            privateId,
          ])
        ).rows[0].ok,
        false,
      );
      await role("authenticated", u1);
      assert.equal(
        (
          await db.query("select public.publish_own_learning($1) as ok", [
            privateId,
          ])
        ).rows[0].ok,
        true,
      );
      await role("anon");
      assert.equal(
        (await db.query("select id from public.analysis_versions")).rows.length,
        2,
      );
      await denied("select * from public.generation_runs");
    },
  );
  await role("service_role");
  await db.query("insert into public.knowledge_bookmarks(user_id,source_key,kind,text,explanation,source_url,provenance) values($1,'concept:eps','concept','EPS','Canonical explanation','/learn#eps','Learning library')",[u1]);
  await role("anon");
  await check("anonymous cannot access private notebooks or sync diagnostics",async()=>{
    await denied("select * from public.knowledge_bookmarks");
    await denied("select * from public.data_sync_runs");
    await denied("insert into public.stock_data(ticker,kind,payload,source,as_of) values('AAPL','price','{}','Alpaca IEX',now())");
    assert.equal((await db.query("select * from public.stock_data")).rows.length,0);
  });
  await role("authenticated",u2);
  await check("notebooks enforce ownership and prevent client-forged explanations",async()=>{
    assert.equal((await db.query("select * from public.knowledge_bookmarks")).rows.length,0);
    await denied("insert into public.knowledge_bookmarks(user_id,source_key,kind,text,explanation,source_url,provenance) values($1,'forged','term','Forged','Forged','/learn','AI explanation')",[u2]);
    await db.query("delete from public.knowledge_bookmarks where user_id=$1",[u1]);
    await role("authenticated",u1);
    assert.equal((await db.query("select * from public.knowledge_bookmarks")).rows.length,1);
    await db.query("delete from public.knowledge_bookmarks where user_id=$1",[u1]);
    assert.equal((await db.query("select * from public.knowledge_bookmarks")).rows.length,0);
  });
  await role("authenticated",u1);
  await check("private notes support own creation, archive and restore; reject forged owners",async()=>{
    const {rows}=await db.query("insert into public.personal_notes(user_id,title,body) values($1,'My note','Private study notes') returning id",[u1]);const id=rows[0].id;
    await denied("insert into public.personal_notes(user_id,title,body) values($1,'Forged','Forged')",[u2]);
    await role("authenticated",u2);assert.equal((await db.query("select * from public.personal_notes")).rows.length,0);await db.query("update public.personal_notes set body='Hacked' where id=$1",[id]);
    await role("authenticated",u1);assert.equal((await db.query("select body from public.personal_notes where id=$1",[id])).rows[0].body,'Private study notes');
    await denied("update public.personal_notes set user_id=$1 where id=$2",[u2,id]);await db.query("update public.personal_notes set archived_at=now() where id=$1",[id]);await db.query("update public.personal_notes set archived_at=null where id=$1",[id]);
    await role("anon");await denied("select * from public.personal_notes");await role("authenticated",u1);
  });
  await check("five-level feedback accepts one own target and valid updates, rejects invalid scores and another owner",async()=>{
    await db.query("insert into public.content_feedback(user_id,target_key,concept_key,score) values($1,'concept:eps','eps',4)",[u1]);
    await db.query("update public.content_feedback set score=5 where user_id=$1",[u1]);
    await denied("insert into public.content_feedback(user_id,target_key,concept_key,score) values($1,'concept:margin','margin',6)",[u1]);
    await denied("insert into public.content_feedback(user_id,target_key,concept_key,score) values($1,'concept:margin','margin',3)",[u2]);
    await denied("insert into public.content_feedback(user_id,target_key,score) values($1,'forged',3)",[u1]);
    await role("authenticated",u2);assert.equal((await db.query("select * from public.content_feedback")).rows.length,0);
    await role("anon");await denied("select * from public.content_feedback");await role("authenticated",u1);
  });
  await check("private analysis feedback is not visible or writable by another member or anonymous Auth account",async()=>{
    await role("service_role");await db.query("update public.analysis_versions set is_public=false where id=$1",[privateId]);await role("authenticated",u2);
    await denied("insert into public.content_feedback(user_id,target_key,analysis_id,score) values($1,$2,$3,3)",[u2,'analysis:'+privateId,privateId]);
    await db.query("select set_config('request.jwt.claims',$1,false)",['{"is_anonymous":true}']);
    await denied("insert into public.content_feedback(user_id,target_key,concept_key,score) values($1,'concept:margin','margin',3)",[u2]);
    await denied("insert into public.personal_notes(user_id,title,body) values($1,'Anonymous','Anonymous')",[u2]);
    await db.query("select set_config('request.jwt.claims','{}',false)");
  });
  await check("public chart cache is read-only and refresh lease coalesces concurrent provider work",async()=>{
    await role("anon");assert.equal((await db.query("select * from public.stock_chart_cache")).rows.length,0);await denied("select public.reserve_chart_refresh('AAPL','live')");
    await denied("insert into public.stock_chart_cache(ticker,range) values('AAPL','live')");
    await role("service_role");assert.equal((await db.query("select public.reserve_chart_refresh('AAPL','live') as ok")).rows[0].ok,true);assert.equal((await db.query("select public.reserve_chart_refresh('AAPL','live') as ok")).rows[0].ok,false);
  });
  await role("service_role");
  await check(
    "quota reservation is idempotent and user daily/minute caps apply",
    async () => {
      const key = "f".repeat(64);
      const first = (
        await db.query(
          "select * from public.reserve_learning_generation($1,'material',$2,'{}',20)",
          [u2, key],
        )
      ).rows[0];
      assert.ok(first.run_id);
      const same = (
        await db.query(
          "select * from public.reserve_learning_generation($1,'material',$2,'{}',20)",
          [u2, key],
        )
      ).rows[0];
      assert.equal(same.run_id, null);
      assert.equal(
        (
          await db.query(
            "select * from public.reserve_learning_generation($1,'material',$2,'{}',20)",
            [u2, "e".repeat(64)],
          )
        ).rows.length,
        0,
      );
    },
  );
  await check("failed attempts still count toward the global cap", async () => {
    const cap = Number(
      (await db.query("select count(*) as n from public.generation_runs"))
        .rows[0].n,
    );
    await db.query(
      "update public.generation_runs set status='failed' where status='reserved'",
    );
    assert.equal(
      (
        await db.query(
          "select * from public.reserve_learning_generation(null,'news',$1,'{}',$2)",
          ["1".repeat(64), cap],
        )
      ).rows.length,
      0,
    );
  });
  await check(
    "invalid completion rolls back; valid completion and run update commit together",
    async () => {
      const { rows } = await db.query(
        "select * from public.reserve_learning_generation(null,'news',$1,'{}',200)",
        ["2".repeat(64)],
      );
      const run = rows[0].run_id;
      await denied(
        "select public.complete_learning_generation($1,'MSFT',$2,null,null,'{}','[{\"id\":\"filing\"}]','en',now(),'{}')",
        [run, newsId],
      );
      assert.equal(
        (
          await db.query(
            "select status from public.generation_runs where id=$1",
            [run],
          )
        ).rows[0].status,
        "reserved",
      );
      const out = await db.query(
        "select public.complete_learning_generation($1,'AAPL',$2,null,null,'{}','[{\"id\":\"filing\"}]','en',now(),'{}') as id",
        [run, newsId],
      );
      assert.ok(out.rows[0].id);
      assert.equal(
        (
          await db.query(
            "select status from public.generation_runs where id=$1",
            [run],
          )
        ).rows[0].status,
        "completed",
      );
    },
  );

  const readerRun='30000000-0000-4000-8000-000000000001',readerId='30000000-0000-4000-8000-000000000002',lessonId='30000000-0000-4000-8000-000000000003',conversationId='30000000-0000-4000-8000-000000000004';
  await role('service_role');
  await db.query("insert into public.generation_runs(id,owner_id,kind,dedupe_key,prompt,status) values($1,$2,'reader','reader-fixture','{}','completed')",[readerRun,u1]);
  await db.query("insert into public.ai_outputs(id,run_id,owner_id,kind,slot,selected_text,content,source_snapshot,source_url,language) values($1,$2,$3,'explain',0,'Revenue','{}','{}','/learn','en')",[readerId,readerRun,u1]);
  await db.query("insert into public.ai_outputs(id,run_id,owner_id,kind,slot,topic_key,content,source_snapshot,source_url,language) values($1,$2,$3,'lesson',1,'margin','{}','{}','/learn','en')",[lessonId,readerRun,u1]);
  await db.query("insert into public.ai_conversations(id,owner_id,title,source_kind,source_id,source_snapshot,language) values($1,$2,'Private article','concept','margin','{}','en')",[conversationId,u1]);
  await check('new AI outputs, conversation snapshots and ratings are private; browsers cannot forge generated content',async()=>{
    await role('anon');for(const table of ['ai_outputs','ai_conversations','ai_daily_sets','ai_lesson_saves','ai_feedback','news_refresh_gate'])await denied('select * from public.'+table);
    await role('authenticated',u2);assert.equal((await db.query('select * from public.ai_outputs')).rows.length,0);assert.equal((await db.query('select * from public.ai_conversations')).rows.length,0);
    await denied("insert into public.ai_outputs(run_id,owner_id,kind,content,source_snapshot,source_url,language) values($1,$2,'explain','{}','{}','/learn','en')",[readerRun,u2]);
    await denied("select * from public.reserve_reader_generation($1,'reader',$2,'{}',20)",[u2,'a'.repeat(64)]);
    await role('authenticated',u1);assert.equal((await db.query('select * from public.ai_outputs')).rows.length,2);await denied('update public.ai_conversations set saved=true');
  });
  await check('five-level votes bind to owned output versions; duplicate insert, forged owner and invalid scores fail',async()=>{
    await db.query('insert into public.ai_feedback(owner_id,output_id,score) values($1,$2,4)',[u1,readerId]);await db.query('update public.ai_feedback set score=5 where output_id=$1',[readerId]);
    await denied('insert into public.ai_feedback(owner_id,output_id,score) values($1,$2,3)',[u1,readerId]);await denied('insert into public.ai_feedback(owner_id,output_id,score) values($1,$2,6)',[u1,lessonId]);await denied('insert into public.ai_feedback(owner_id,output_id,score) values($1,$2,3)',[u2,lessonId]);
    await role('authenticated',u2);assert.equal((await db.query('select * from public.ai_feedback')).rows.length,0);await denied('insert into public.ai_feedback(owner_id,output_id,score) values($1,$2,3)',[u2,readerId]);await role('authenticated',u1);
    await db.query("select set_config('request.jwt.claims','{\"is_anonymous\":true}',false)");assert.equal((await db.query('select * from public.ai_outputs')).rows.length,0);await denied('insert into public.ai_feedback(owner_id,output_id,score) values($1,$2,3)',[u1,lessonId]);await db.query("select set_config('request.jwt.claims','{}',false)");
  });
  await check('Learn stars only save owned lessons; stars are idempotent and can be removed',async()=>{
    await denied('insert into public.ai_lesson_saves(owner_id,output_id) values($1,$2)',[u1,readerId]);await db.query('insert into public.ai_lesson_saves(owner_id,output_id) values($1,$2) on conflict do nothing',[u1,lessonId]);await db.query('insert into public.ai_lesson_saves(owner_id,output_id) values($1,$2) on conflict do nothing',[u1,lessonId]);assert.equal((await db.query('select * from public.ai_lesson_saves')).rows.length,1);
    await role('authenticated',u2);assert.equal((await db.query('select * from public.ai_lesson_saves')).rows.length,0);await denied('insert into public.ai_lesson_saves(owner_id,output_id) values($1,$2)',[u2,lessonId]);await role('authenticated',u1);await db.query('delete from public.ai_lesson_saves where output_id=$1',[lessonId]);
  });
  await check('reader reservations share global budget with legacy AI and reuse completed outputs without charging again',async()=>{
    await role('service_role');await db.query("update public.generation_runs set created_at=now()-interval '3 minutes'");const cap=Number((await db.query('select count(*) n from public.generation_runs')).rows[0].n);
    assert.equal((await db.query("select * from public.reserve_reader_generation($1,'reader',$2,'{}',$3)",[u1,'a'.repeat(64),cap])).rows[0].state,'quota');
    const r=(await db.query("select * from public.reserve_reader_generation($1,'reader',$2,'{}',200)",[u1,'b'.repeat(64)])).rows[0];assert.ok(r.run_id);
    const output=[{kind:'explain',slot:0,content:{title:'Revenue',answer:'Earned sales',citations:['source']},source_snapshot:{},source_url:'/learn',language:'en',selected_text:'Revenue'}];
    const done=await db.query("select * from public.complete_reader_generation($1,$2,'{}')",[r.run_id,JSON.stringify(output)]);assert.equal(done.rows.length,1);
    const cached=(await db.query("select * from public.reserve_reader_generation($1,'reader',$2,'{}',1)",[u1,'b'.repeat(64)])).rows[0];assert.equal(cached.cached_run,r.run_id);assert.equal(cached.state,'cached');
  });
  await check('conversation revision and output commit atomically; daily lessons require exactly five in one transaction',async()=>{
    await role('service_role');await db.query("insert into public.generation_runs(owner_id,kind,dedupe_key,prompt) values($1,'chat','chat-fixture','{}'),($1,'daily','daily-fixture','{}')",[u1]);
    const chat=(await db.query("select id from public.generation_runs where dedupe_key='chat-fixture'")).rows[0].id,daily=(await db.query("select id from public.generation_runs where dedupe_key='daily-fixture'")).rows[0].id;
    const reply=[{kind:'reply',slot:0,question:'Explain',content:{},source_snapshot:{},source_url:'/learn',language:'en'}];await denied("select * from public.complete_reader_generation($1,$2,'{}',$3,1)",[chat,JSON.stringify(reply),conversationId]);assert.equal((await db.query('select revision from public.ai_conversations where id=$1',[conversationId])).rows[0].revision,0);
    await db.query("select * from public.complete_reader_generation($1,$2,'{}',$3,0)",[chat,JSON.stringify(reply),conversationId]);assert.equal((await db.query('select revision from public.ai_conversations where id=$1',[conversationId])).rows[0].revision,1);
    const lessons=Array.from({length:5},(_,slot)=>({kind:'lesson',slot,topic_key:'topic-'+slot,content:{},source_snapshot:{},source_url:'/learn',language:'en'}));await denied("select * from public.complete_reader_generation($1,$2,'{}',null,null,current_date)",[daily,JSON.stringify(lessons.slice(0,4))]);assert.equal((await db.query('select * from public.ai_daily_sets')).rows.length,0);
    await db.query("select * from public.complete_reader_generation($1,$2,'{}',null,null,current_date)",[daily,JSON.stringify(lessons)]);assert.equal((await db.query('select * from public.ai_daily_sets')).rows.length,1);
  });
  await check('market/document caches are service-only and shared market lease admits one refresh',async()=>{
    await role('anon');await denied('select * from public.market_refresh_state');await denied('select * from public.filing_documents');await denied('select public.reserve_market_refresh()');
    await role('authenticated',u1);await denied('select * from public.filing_documents');await denied('update public.market_refresh_state set expires_at=now()');
    await role('service_role');assert.equal((await db.query('select public.reserve_market_refresh() ok')).rows[0].ok,true);assert.equal((await db.query('select public.reserve_market_refresh() ok')).rows[0].ok,false);
  });
  await check('language and context versions coexist without replacing rated conversation or daily records',async()=>{
    await db.query("insert into public.ai_conversations(owner_id,title,source_kind,source_id,source_snapshot,language,source_version) values($1,'Same source, new context','concept','margin','{}','en','v6'),($1,'New language','concept','margin','{}','zh-Hans','v6')",[u1]);
    assert.equal((await db.query('select count(*) n from public.ai_conversations where owner_id=$1',[u1])).rows[0].n,3);
    const run=(await db.query("insert into public.generation_runs(owner_id,kind,dedupe_key,prompt) values($1,'daily','daily-zh-fixture','{}') returning id",[u1])).rows[0].id;
    const lessons=Array.from({length:5},(_,slot)=>({kind:'lesson',slot,topic_key:'zh-topic-'+slot,content:{},source_snapshot:{},source_url:'/learn',language:'zh-Hans'}));await db.query("select * from public.complete_reader_generation($1,$2,'{}',null,null,current_date)",[run,JSON.stringify(lessons)]);assert.equal((await db.query('select count(*) n from public.ai_daily_sets where owner_id=$1',[u1])).rows[0].n,2);
    await role('authenticated',u2);assert.equal((await db.query('select count(*) n from public.ai_daily_sets')).rows[0].n,0);
  });
  const imageId='40000000-0000-4000-8000-000000000001',imageNote='40000000-0000-4000-8000-000000000002';
  await check('images and private storage reject anonymous or cross-owner access, forged media and note associations',async()=>{
    await role('service_role');assert.equal((await db.query("select public.reserve_user_image($1,$2,$3,100,100,100) ok",[imageId,u1,'a'.repeat(64)])).rows[0].ok,true);await db.query("update public.user_images set status='ready' where id=$1",[imageId]);await db.query("insert into storage.objects(bucket_id,name) values('notebook-images',$1)",[u1+'/'+imageId+'.webp']);
    await role('anon');await denied('select * from public.user_images');await denied('select * from public.ai_lesson_comments');assert.equal((await db.query("select * from storage.objects where bucket_id='notebook-images'")).rows.length,0);
    await role('authenticated',u2);assert.equal((await db.query('select * from public.user_images')).rows.length,0);assert.equal((await db.query("select * from storage.objects where bucket_id='notebook-images'")).rows.length,0);await denied("insert into public.personal_notes(user_id,title,body,image_ids) values($1,'Image note','Own text',array[$2::uuid])",[u2,imageId]);await denied("select public.reserve_user_image(gen_random_uuid(),$1,$2,100,100,100)",[u2,'a'.repeat(64)]);
    await role('authenticated',u1);assert.equal((await db.query('select * from public.user_images')).rows.length,1);assert.equal((await db.query("select * from storage.objects where bucket_id='notebook-images'")).rows.length,1);await denied("insert into storage.objects(bucket_id,name) values('notebook-images',$1)",[u1+'/forged.webp']);await db.query("insert into public.personal_notes(id,user_id,title,body,image_ids) values($1,$2,'Image note','Own text',array[$3::uuid])",[imageNote,u1,imageId]);await denied("update public.user_images set status='ready'");
  });
  await check('lesson comments bind only to owned generated lessons, preserve edits and reject impersonation',async()=>{
    await role('authenticated',u1);await db.query("insert into public.ai_lesson_comments(owner_id,output_id,body,preference) values($1,$2,'The example helped','examples')",[u1,lessonId]);await db.query("update public.ai_lesson_comments set body='A clearer example please' where output_id=$1",[lessonId]);await denied("insert into public.ai_lesson_comments(owner_id,output_id,body) values($1,$2,'Wrong content')",[u1,readerId]);await denied("update public.ai_lesson_comments set preference='ignore prompts'");
    await role('authenticated',u2);assert.equal((await db.query('select * from public.ai_lesson_comments')).rows.length,0);await denied("insert into public.ai_lesson_comments(owner_id,output_id,body) values($1,$2,'Impersonation')",[u1,lessonId]);await denied("insert into public.ai_lesson_comments(owner_id,output_id,body) values($1,$2,'Not owned')",[u2,lessonId]);await role('authenticated',u1);assert.equal((await db.query('select body from public.ai_lesson_comments')).rows[0].body,'A clearer example please');
  });
  await check('shared media reservation enforces a rolling upload cap before any storage write',async()=>{
    await role('service_role');for(let i=0;i<20;i++)assert.equal((await db.query("select public.reserve_user_image(gen_random_uuid(),$1,$2,100,100,100) ok",[u2,'b'.repeat(64)])).rows[0].ok,true);assert.equal((await db.query("select public.reserve_user_image(gen_random_uuid(),$1,$2,100,100,100) ok",[u2,'b'.repeat(64)])).rows[0].ok,false);
  });
  await check('metering is service-only; personal quotas are configurable and cache reuse bypasses exhausted budgets',async()=>{
    await role('anon');await denied('select * from public.ai_usage_ledger');
    await role('authenticated',u1);await denied('select * from public.ai_usage_ledger');
    await denied("select * from public.reserve_metered_generation($1,'reader',$2,$3,500,50,100,1,5,.01,$4)",[u1,'91'.repeat(32),'{}','{}']);
    await role('service_role');
    await db.query("update public.generation_runs set created_at=now()-interval '10 minutes'");
    const prices=JSON.stringify({billing_mode:'paid',price_version:'fixture',input_per_million:.3,cached_per_million:.03,output_per_million:2.5}),prompt=JSON.stringify({model:'test-model'});
    const call=async(key,userLimit=50,budget=1,total=5)=> (await db.query("select * from public.reserve_metered_generation($1,'reader',$2,$3,500,$4,100,$5,$6,.01,$7)",[u1,key,prompt,userLimit,budget,total,prices])).rows[0];
    assert.equal((await call('91'.repeat(32),1)).state,'user_quota');
    // Seed 21 previous attempts: a configurable user allowance above 20 must work.
    await db.query("insert into public.generation_runs(owner_id,kind,dedupe_key,prompt,status,created_at) select $1,'reader','meter-old-'||n,'{}','failed',now()-interval '10 minutes' from generate_series(1,21) n",[u1]);
    const r=await call('92'.repeat(32));assert.ok(r.run_id,JSON.stringify(r));
    await db.query("select public.settle_ai_usage($1,$2,true,200)",[r.run_id,JSON.stringify({promptTokenCount:1000,cachedContentTokenCount:500,candidatesTokenCount:300,thoughtsTokenCount:100,totalTokenCount:1400})]);
    const ledger=(await db.query('select * from public.ai_usage_ledger where run_id=$1',[r.run_id])).rows[0];assert.equal(Number(ledger.estimated_cost_usd),.001165);assert.equal(ledger.state,'recorded');
    await db.query("update public.generation_runs set status='completed' where id=$1",[r.run_id]);
    const cached=await call('92'.repeat(32),1,0,0);assert.equal(cached.cached_run,r.run_id);
    await db.query("update public.generation_runs set created_at=now()-interval '10 minutes' where id=$1",[r.run_id]);
    assert.equal((await call('93'.repeat(32),50,.001,5)).state,'daily_budget');
    assert.equal((await call('93'.repeat(32),50,1,.001)).state,'total_budget');
    const uncertain=await call('94'.repeat(32));assert.ok(uncertain.run_id);
    await db.query("select public.settle_ai_usage($1,'{}',true,null)",[uncertain.run_id]);
    assert.equal((await db.query('select state from public.ai_usage_ledger where run_id=$1',[uncertain.run_id])).rows[0].state,'unknown');
    await db.query("update public.generation_runs set created_at=now()-interval '10 minutes' where id=$1",[uncertain.run_id]);
    assert.equal((await call('95'.repeat(32),50,.015,5)).state,'daily_budget');
    // A definite quota rejection releases its hold; repeating settlement cannot overwrite known usage.
    await db.query("select public.settle_ai_usage($1,'{}',true,429)",[uncertain.run_id]);
    assert.equal(Number((await db.query('select estimated_cost_usd from public.ai_usage_ledger where run_id=$1',[uncertain.run_id])).rows[0].estimated_cost_usd),0);
    await db.query("select public.settle_ai_usage($1,'{}',false,null)",[r.run_id]);
    assert.equal(Number((await db.query('select estimated_cost_usd from public.ai_usage_ledger where run_id=$1',[r.run_id])).rows[0].estimated_cost_usd),.001165);
  });
  console.log(
    `PASS: ${passed} PostgreSQL migration and RLS scenarios. Production database was not touched.`,
  );
} finally {
  await db.close();
}

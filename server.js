import { serve } from "https://deno.land/std@0.151.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.151.0/http/file_server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@1.34.0';

let url = 'https://ekzwclcfheomwmnteywk.supabase.co';
let anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrendjbGNmaGVvbXdtbnRleXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Njc1NzE2NjQsImV4cCI6MTk4MzE0NzY2NH0.5ZeHJT23ZrIzOWJQtP4AncFpqCMp-lB2xbxXF592zpg';
const supabase = createClient(url, anon_key);

let login_checks = [];

serve(async (req) => {
  const pathname = new URL(req.url).pathname;
  console.log(pathname);

  if (req.method === "POST" && pathname === "/register") {
    const requestJson = await req.json();

    let sp = await supabase // userテーブルへ問い合わせ
      .from('user')
      .select()
      .eq( 'username', requestJson.username );

    if (sp.data.length == 0){

      let sp1 = await supabase // userテーブルへ問い合わせ
        .from('user')
        .insert({ username: `${requestJson.username}`, password: `${requestJson.password}`, color: `${requestJson.color}` });
      
      if (sp1.error == null) {
        return new Response('0'); // 新規登録成功と返す
      }else{
        return new Response('internal error'); // 内部エラーと返す
      }
      
    }else{
      return new Response('同じユーザー名がすでに登録されています'); // ユーザー名被りエラーと返す
    }
  }

  if (req.method === "POST" && pathname === "/create_calendar") {
    const requestJson = await req.json();
    
    let rdm_group;
    let sp;
    do{
      rdm_group = Math.floor(Math.random() * 1000000000000000);
      sp = await supabase // userテーブルへ問い合わせ
        .from('user')
        .select()
        .eq( 'group', rdm_group );
    }while(sp.data.length != 0); // rdm_groupに生成したランダムの整数が被っていない場合、ループから抜ける

    if (sp.data.length == 0){
      let sp1 = await supabase // userテーブルへ問い合わせ
        .from('user')
        .update({ group: `${rdm_group}`})
        .eq( 'username', requestJson.username );

      return new Response(rdm_group);
    }else{
      return new Response('-1');
    }
  }

  if (req.method === "POST" && pathname === "/join_calendar") {
    const requestJson = await req.json();
    let sp;
    sp = await supabase // invite_codeテーブルへ問い合わせ
      .from('invite_code')
      .select()
      .eq( 'code', requestJson.invite_code );

    if (sp.data.length == 1){
      sp = await supabase // userテーブルへ問い合わせ
        .from('user')
        .update({ group: `${sp.data[0].group}`})
        .eq( 'username', requestJson.username );

      return new Response(sp.data[0].group);

    }else{
      return new Response('-1');
    }
  }

  if (req.method === "POST" && pathname === "/login") {
    const requestJson = await req.json();
    let sp = await supabase // userテーブルへ問い合わせ
      .from('user')
      .select()
      .eq( 'username', requestJson.user )
      .eq( 'password', requestJson.pass );
    
    if (sp.error == null) { // エラーがないとき
      if (sp.data.length == 1){ // データベースに、対応するアカウントが１つある場合
        if (login_checks.length == 0) {
          login_checks.push(sp.data[0].username + "@@" + sp.data[0].group + "@@" + sp.data[0].color);
    
        } else {
          while (login_checks.length != 0) {
            setTimeout( ()=>{}, 1000 );
          }
          login_checks.push(sp.data[0].username + "@@" + sp.data[0].group + "@@" + sp.data[0].color);
        }

        return new Response('0'); // 0を返す


      }else if (sp.data.length < 1){ // データベースに、対応するアカウントがない場合
        return new Response('-1'); // ログイン失敗（エラー）と返す

      }else{ // データベースに、対応するアカウントが２つ以上ある場合（そんなことは通常ありえない）
        return new Response('-2'); // エラーと返す
      }

    }else{
      return new Response('-3'); // エラーと返す
    }
  }

  if (req.method === "GET" && pathname === "/login") {
    let data = login_checks.pop();
    login_checks = [];
    return new Response(data);
  }

  if (req.method === "POST" && pathname === "/send") {
    const requestJson = await req.json();
    let sp;

    if (requestJson.comment.includes('||') || requestJson.comment.includes('@@')){
      return new Response('');
    } else {
      sp = await supabase
        .from('calendar')
        .insert({ group: `${requestJson.group}`, username: `${requestJson.username}`, color: `${requestJson.colorID}`, sche_start: `${requestJson.sche_start}`, sche_end: `${requestJson.sche_end}`, comment: `${requestJson.comment}` }); // calendarへデータ挿入
    }

    if (sp.error == null) {
      return new Response('successfully');
    } else {
      return new Response(sp.error.message);
    }
  }

  if (req.method === "POST" && pathname === "/download_month") {
    const requestJson = await req.json();
    let group = requestJson.group;
    let time = requestJson.time;
    let sp = await supabase // calendarテーブルへ問い合わせ
      .from('calendar')
      .select()
      .eq('group', group);
    
    if (sp.error == null) {
      let data = '';
      for (let i = 0; i < sp.data.length; i++) {
        if (sp.data[i].sche_start.includes(`${time}`)){
          data += sp.data[i].id + '||';
          data += sp.data[i].created_at + '||';
          data += sp.data[i].username + '||';
          data += sp.data[i].color + '||';
          data += sp.data[i].sche_start + '||';
          data += sp.data[i].sche_end + '||';
          data += sp.data[i].comment + '@@';
        }
      }
      return new Response(data);
    } else {
      return new Response('Database Error');
    }
  }

  if (req.method === "POST" && pathname === "/download_day") {
    const requestJson = await req.json();
    let group = requestJson.group;
    let day = requestJson.day;
    let sp = await supabase // calendarテーブルへ問い合わせ
      .from('calendar')
      .select()
      .eq('group', group);
    
    if (sp.error == null) {
      let data = '';
      for (let i = 0; i < sp.data.length; i++) {
        if (sp.data[i].sche_start.includes(`${day}`)){
          data += sp.data[i].id + '||';
          data += sp.data[i].created_at + '||';
          data += sp.data[i].username + '||';
          data += sp.data[i].color + '||';
          data += sp.data[i].sche_start + '||';
          data += sp.data[i].sche_end + '||';
          data += sp.data[i].comment + '@@';
        }
      }
      return new Response(data);
    } else {
      return new Response('Database Error');
    }
  }

  if (req.method === "POST" && pathname === "/check_day_amount") {
    const requestJson = await req.json();
    let group = requestJson.group;
    let day = requestJson.day;
    let sp = await supabase // calendarテーブルへ問い合わせ
      .from('calendar')
      .select()
      .eq('group', group);
    
    if (sp.error == null) {
      let amount = 0;
      for (let i = 0; i < sp.data.length; i++) {
        if (sp.data[i].sche_start.includes(`${day}`)){
          amount = amount + 1;
        }
      }
      return new Response(amount);
    } else {
      return new Response('Database Error');
    }
  }

  if (req.method === "POST" && pathname === "/delete") {
    const requestJson = await req.json();
    let sp = await supabase // calendarテーブルへ問い合わせ
      .from('calendar')
      .delete()
      .match({ id: `${requestJson.id}` });

    if (sp.error == null) {
      return new Response('successfully');
    } else{
      return new Response('Database Error');
    }
  };

  if (req.method === "POST" && pathname === "/invite_check") {
    const requestJson = await req.json();
    let sp = await supabase // invite_codeテーブルへ問い合わせ
      .from('invite_code')
      .select()
      .eq('group', requestJson.group);

    if (sp.data.length != 0){
      return new Response(sp.data[0].code);

    }else{
      return new Response('-1');
    }
  }

  if (req.method === "POST" && pathname === "/invite_enable") {
    const requestJson = await req.json();
    let sp = await supabase // invite_codeテーブルへ問い合わせ
      .from('invite_code')
      .select()
      .eq('group', requestJson.group);

    if (sp.data.length != 0){
      return new Response(sp.data[0].code);

    }else{
      let sp1 = await supabase // invite_codeへデータ挿入
        .from('invite_code')
        .insert({ group: `${requestJson.group}`, code: `${requestJson.rand_str}` });
        
      return new Response('0');
    }
  }

  if (req.method === "POST" && pathname === "/invite_disable") {
    const requestJson = await req.json();
    let sp = await supabase // invite_codeテーブルへ問い合わせ
      .from('invite_code')
      .delete()
      .match({ group: `${requestJson.group}` });

    return new Response();
  }








  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
});
from pathlib import Path
p=Path('api/src/index.ts')
s=p.read_text()
old="""function requestedVideoSeconds(prompt:string){
  const m=prompt.match(/(\\d+)\\s*(?:minute|minutes|min)\\b/i); if(m) return Math.max(1,Math.min(60,Number(m[1])*60));
  const sec=prompt.match(/(\\d+)\\s*(?:second|seconds|sec|secs)\\b/i); if(sec) return Math.max(1,Math.min(60,Number(sec[1])));
  return 8;
}"""
new="""function requestedVideoSeconds(prompt:string){
  const m=prompt.match(/(\\d+)\\s*(?:minute|minutes|min)\\b/i); if(m) return Math.max(1,Math.min(60,Number(m[1])*60));
  const sec=prompt.match(/(\\d+)\\s*(?:second|seconds|sec|secs)\\b/i); if(sec) return Math.max(1,Math.min(60,Number(sec[1])));
  if(/\\b(?:talk|talking|conversation|dialogue|speak|speaking|discuss|chat)\\b/i.test(prompt)) return 20;
  return 12;
}"""
if old not in s: raise SystemExit('requestedVideoSeconds anchor not found')
s=s.replace(old,new,1)
old2="""      const scenePrompt=sceneCount>1?`${prompt}\\nScene ${i+1} of ${sceneCount}. Keep the same characters, visual style and story continuity. Continue naturally and last about ${sceneSec} seconds.`:prompt;"""
new2="""      const wantsTalking=/\\b(?:talk|talking|conversation|dialogue|speak|speaking|discuss|chat)\\b/i.test(prompt);
      const talkingDirection=wantsTalking?' The characters must visibly speak to each other with natural mouth movement, alternating conversational gestures, eye contact, and reaction shots.':' ';
      const scenePrompt=sceneCount>1?`${prompt}\\nScene ${i+1} of ${sceneCount}. Keep the same characters, clothing, visual style and story continuity.${talkingDirection} Continue naturally and last about ${sceneSec} seconds.`:`${prompt}${talkingDirection}`;"""
if old2 not in s: raise SystemExit('scenePrompt anchor not found')
s=s.replace(old2,new2,1)
old3="""  let text=prompt.replace(/\\b(?:create|make|generate|produce)\\b/ig,'').replace(/\\b\\d+\\s*(?:minutes?|mins?|seconds?|secs?)\\b/ig,'').replace(/\\b(?:video|cartoon|animation|clip)\\b/ig,'').replace(/\\s+/g,' ').trim();
  if(!text) text='Here is Kai with your animated story.';"""
new3="""  let text=prompt.replace(/\\b(?:create|make|generate|produce)\\b/ig,'').replace(/\\b\\d+\\s*(?:minutes?|mins?|seconds?|secs?)\\b/ig,'').replace(/\\b(?:video|cartoon|animation|clip)\\b/ig,'').replace(/\\s+/g,' ').trim();
  const wantsTalking=/\\b(?:talk|talking|conversation|dialogue|speak|speaking|discuss|chat)\\b/i.test(prompt);
  if(wantsTalking && text) text=`Hello! ${text}. Sure, let's talk about it together. That sounds good. Let's continue.`;
  if(!text) text='Here is Kai with your animated story.';"""
if old3 not in s: raise SystemExit('narration anchor not found')
s=s.replace(old3,new3,1)
s=s.replace("maxOutputSeconds:60,sceneSeconds:8,frame:'512x288 16:9',voice:'Edge neural TTS (free best-effort)'","maxOutputSeconds:60,sceneSeconds:8,defaultSeconds:12,talkingDefaultSeconds:20,frame:'512x288 16:9',voice:'Edge neural TTS (free best-effort)'",1)
p.write_text(s)
print('Kai talking duration patch applied')

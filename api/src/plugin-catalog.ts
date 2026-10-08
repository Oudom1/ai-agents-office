import type { Express, RequestHandler } from 'express';

/**
 * Curated integration assessment. Catalog items are NOT installed by listing them.
 * Never execute remote plugin code or accept arbitrary install URLs from clients.
 */
const plugins = [
  {id:'claude-mem',name:'Claude-Mem',category:'memory',agents:['manager','developer','verification','qa','cloud','sysadmin','security'],repository:'https://github.com/thedotmack/claude-mem',capability:'Persistent coding-agent memory',integration:'adapter-required',risk:'high',notes:'Claude Code-oriented. Requires external runtime, storage isolation and review of data retention.'},
  {id:'agent-skills',name:'Agent Skills',category:'workflow',agents:['manager','developer','verification','qa','cloud','sysadmin','security'],repository:'https://github.com/addyosmani/agent-skills',capability:'Reusable spec, plan, build, test and ship instructions',integration:'skill-port',risk:'medium',notes:'Port suitable instructions into agent orchestration; do not execute arbitrary skill shell commands.'},
  {id:'omniroute',name:'OmniRoute',category:'model-routing',agents:['manager','developer','cloud'],repository:'https://github.com/Henrikmatos/omniroute',capability:'Routing between supported model providers',integration:'gateway-required',risk:'high',notes:'Confirm license, authentication, spend limits and provider API compatibility.'},
  {id:'ponytail',name:'Ponytail',category:'coding-workflow',agents:['developer','verification','qa'],repository:'https://github.com/DietrichGebert/ponytail',capability:'Coding workflow and project guidance',integration:'skill-port',risk:'medium',notes:'Review skill instructions and tool permissions before execution.'},
  {id:'graphify',name:'Graphify',category:'code-knowledge',agents:['developer','verification','security','sysadmin'],repository:'https://github.com/blockflix/Graphify',capability:'Graph-based code and dependency exploration',integration:'adapter-required',risk:'high',notes:'Requires scoped code access and a controlled graph storage lifecycle.'}
] as const;

export function registerPluginCatalog(app:Express,requireAuth:RequestHandler){
  app.get('/api/plugins',requireAuth,(_req,res)=>res.json({
    plugins:plugins.map(p=>({...p,status:'not-installed',enabled:false,compatible:null})),
    summary:{installed:0,enabled:0,assessment:'pending',lastChecked:null},
    message:'Discovery catalog only. No plugin has been installed or activated by this API.'
  }));
  app.get('/api/plugins/:id',requireAuth,(req,res)=>{
    const plugin=plugins.find(p=>p.id===req.params.id);
    if(!plugin)return res.status(404).json({error:'Unknown plugin'});
    return res.json({...plugin,status:'not-installed',enabled:false,compatible:null,
      checklist:['Verify repository and pinned version','Review licensing and runtime','Security review by Mina','QA test by Lina','Approve deployment by Noah']});
  });
}

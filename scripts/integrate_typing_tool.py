from pathlib import Path

p=Path('frontend/src/main.tsx')
s=p.read_text()

s=s.replace("const API = API_BASE + '/api';", "const API = API_BASE + '/api';\nconst TYPING_TOOL_URL = 'https://typing-tool-pu0o.onrender.com';", 1)

s=s.replace("  const [notice, setNotice] = useState('');\n  const [now, setNow] = useState(Date.now());", "  const [notice, setNotice] = useState('');\n  const [now, setNow] = useState(Date.now());\n  const [showTypingTool, setShowTypingTool] = useState(false);", 1)

old="""          {selected === 'developer' && <div className=\"panel developer-panel\"><div className=\"kai-title\"><h2>Leo Developer Studio</h2><span>PORTFOLIO</span></div><p className=\"kai-note\">Alex delegates portfolio development to Leo. Leo focuses on React, TypeScript, responsive UI, GitHub integration, testing handoff to Lina, and deployment preparation.</p><div className=\"skill-tags\"><span>React</span><span>TypeScript</span><span>UI / UX</span><span>GitHub</span><span>GitHub Pages</span><span>Portfolio</span></div><label>Quick development tasks</label><div className=\"template-grid\">{leoPortfolioTemplates.map(t => <button key={t.name} className=\"template-btn\" onClick={() => launchLeoTemplate(t.name, t.prompt)}>{t.name}</button>)}</div></div>}"""
new="""          {selected === 'developer' && <div className=\"panel developer-panel\"><div className=\"kai-title\"><h2>Leo Developer Studio</h2><span>PORTFOLIO</span></div><p className=\"kai-note\">Alex delegates portfolio development to Leo. Leo focuses on React, TypeScript, responsive UI, GitHub integration, testing handoff to Lina, and deployment preparation.</p><div className=\"skill-tags\"><span>React</span><span>TypeScript</span><span>UI / UX</span><span>GitHub</span><span>GitHub Pages</span><span>Portfolio</span><span>Typing Tool</span></div><button className=\"assign-btn\" style={{marginBottom:'10px'}} onClick={() => setShowTypingTool(true)}>⌨ Open Typing Tool</button><p className=\"kai-note\">Integrated training app: Easy / Medium / Hard, 15 / 30 / 60 seconds, WPM, accuracy, history, leaderboard, levels, and mountain challenges.</p><label>Quick development tasks</label><div className=\"template-grid\">{leoPortfolioTemplates.map(t => <button key={t.name} className=\"template-btn\" onClick={() => launchLeoTemplate(t.name, t.prompt)}>{t.name}</button>)}</div></div>}"""
if old not in s:
    raise SystemExit('Leo panel anchor not found')
s=s.replace(old,new,1)

anchor="""      </main>\n    </div>\n  );\n}"""
modal="""      </main>\n      {showTypingTool && <div onClick={() => setShowTypingTool(false)} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(2,8,18,.86)',display:'flex',alignItems:'center',justifyContent:'center',padding:'18px'}}><div onClick={e => e.stopPropagation()} style={{width:'min(1500px,96vw)',height:'min(920px,92vh)',background:'#081523',border:'1px solid #294b68',borderRadius:'14px',boxShadow:'0 24px 80px rgba(0,0,0,.55)',overflow:'hidden',display:'flex',flexDirection:'column'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid #294b68',background:'#0d1d2d'}}><div><b style={{color:'#e9f7ff'}}>⌨ Leo Typing Tool</b><span style={{marginLeft:'10px',fontSize:'11px',color:'#6f8ca5'}}>Integrated training workspace</span></div><div style={{display:'flex',gap:'8px'}}><a href={TYPING_TOOL_URL} target=\"_blank\" rel=\"noreferrer\" style={{padding:'7px 10px',border:'1px solid #315878',borderRadius:'7px',color:'#bfe9ff',textDecoration:'none',fontSize:'11px'}}>Open Full Screen ↗</a><button onClick={() => setShowTypingTool(false)} style={{padding:'7px 11px',background:'#35121d',border:'1px solid #8f3d4b',borderRadius:'7px',color:'#ffd8e1'}}>Close</button></div></div><iframe title=\"Leo Typing Tool\" src={TYPING_TOOL_URL} style={{width:'100%',height:'100%',border:0,background:'#07111c'}} allow=\"clipboard-read; clipboard-write\" /></div></div>}\n    </div>\n  );\n}"""
if anchor not in s:
    raise SystemExit('App closing anchor not found')
s=s.replace(anchor,modal,1)

p.write_text(s)
print('Typing Tool integration patch applied')

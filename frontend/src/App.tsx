import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { CloudRain, Activity, Map as MapIcon, ShieldAlert, ChartNoAxesCombined, Database, Info, RefreshCw, Play, CloudSun, Moon, Sun, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const pages = [
  { id: 'overview', label: 'Overview', icon: CloudSun },
  { id: 'map', label: 'Rainfall map', icon: MapIcon },
  { id: 'regimes', label: 'Weather patterns', icon: Activity },
  { id: 'correction', label: 'Forecast comparison', icon: ChartNoAxesCombined },
  { id: 'alerts', label: 'Heavy rain watch', icon: ShieldAlert },
  { id: 'verification', label: 'How it performed', icon: ChartNoAxesCombined },
  { id: 'data', label: 'Project details', icon: Database },
  { id: 'sources', label: 'Sources', icon: Info },
] as const;
type PageId = typeof pages[number]['id'];
type Point = { latitude:number; longitude:number; predicted_regime:string; nwp_mm:number; global_mm:number; corrected_mm:number; observation_mm:number; error_mm:number; heavy_probability:number };
function pageFromHash(): PageId { const id = window.location.hash.replace(/^#\/?/, '') as PageId; return pages.some(p => p.id === id) ? id : 'overview'; }

export default function App() {
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [data, setData] = useState<Point[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [regimes, setRegimes] = useState<any>(null);
  const [layer, setLayer] = useState('corrected_mm');
  const [threshold, setThreshold] = useState(64.5);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [night, setNight] = useState(() => { try { return localStorage.getItem('meghsetu-theme') === 'night'; } catch { return false; } });

  useEffect(() => {
    const sync = () => setPage(pageFromHash());
    window.addEventListener('hashchange', sync);
    if (!window.location.hash) window.location.hash = '#/overview';
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => { try { localStorage.setItem('meghsetu-theme', night ? 'night' : 'day'); } catch { /* Theme still works for this session. */ } }, [night]);

  async function load() {
    setLoading(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const responses = await Promise.all(['/forecast/' + date, '/metrics', '/metadata', '/regimes'].map(path => fetch(API + path)));
      if (responses.some(response => !response.ok)) throw new Error('The rainfall service could not return the latest sample.');
      const [forecast, score, info, regimeInfo] = await Promise.all(responses.map(response => response.json()));
      setData(forecast.items); setMetrics(score); setMetadata(info); setRegimes(regimeInfo); setError('');
    } catch (e:any) { setError(e.message || 'Could not connect to the rainfall service.'); }
    finally { setLoading(false); }
  }
  async function run() {
    setBusy(true);
    try {
      const response = await fetch(API + '/generate-demo-data', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({seed:42,samples:4200}) });
      if (!response.ok) throw new Error('Could not refresh the sample data.');
      await load();
    } catch (e:any) { setError(e.message || 'Could not refresh the sample data.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);

  const current = pages.find(item => item.id === page)!;
  const chartRows = metrics ? ['raw','global','regime_aware'].map(key => ({ model:key==='raw'?'Raw NWP':key==='global'?'Global correction':'Pattern-based', RMSE:metrics[key].rmse, MAE:metrics[key].mae })) : [];
  const alerts = data.filter(item => item.corrected_mm >= threshold).sort((a,b) => b.heavy_probability-a.heavy_probability).slice(0,15);
  const pageView = <div className="page-enter" key={page}>
    {page === 'overview' && <>
      <section className="hero"><small>SMART INDIA HACKATHON 2026 · SIH26080</small><h2>Monsoon forecasts,<br/><em>with more context.</em></h2><p>MeghSetu identifies the weather pattern, adjusts the rainfall forecast and highlights possible heavy-rain areas.</p><button className="primary" onClick={run}><Play size={14}/>{busy?'Updating models…':'Run analysis'}</button><div className="heroicon"><CloudRain size={68}/><span>FORECAST → PATTERN → GUIDANCE</span></div></section>
      <div className="kpis">{[['Grid points',metadata?.test_samples?.toLocaleString()??'—','held-out sample points',MapIcon],['Weather patterns','6','pattern categories',Activity],['Heavy-rain threshold',threshold+' mm','24-hour accumulation',ShieldAlert],['Models',metrics?'Ready':'Preparing','local analysis pipeline',Activity]].map(([title,value,sub,Icon]:any)=><div key={title}><span>{title}</span><b>{value}</b><small>{sub}</small><Icon/></div>)}</div>
      <div className="cols"><Card title="Rainfall across India" tag="GENERATED SAMPLE POINTS"><Map data={data.slice(0,190)} layer={layer} night={night}/></Card><Card title="Forecast comparison" tag="LOWER ERROR IS BETTER"><ErrorChart chart={chartRows}/></Card></div>
      <div className="cols"><Card title="How MeghSetu works"><ol>{['Read forecast and weather inputs','Identify the current weather pattern','Apply that pattern’s correction model','Show rainfall estimates and heavy-rain chances'].map((text,index)=><li key={text}><span>0{index+1}</span>{text}</li>)}</ol></Card><Card title="Current run"><Status label="Data source" value={metadata?'Generated sample values':'Preparing sample values'}/><Status label="Pattern classifier" value={metrics?'Ready':'Preparing'}/><Status label="Evaluation" value="Separate holdout sample"/><Status label="Repeatable seed" value={metadata?.seed??42}/></Card></div>
    </>}
    {page === 'map' && <Card title="India rainfall field" tag="SAMPLE RAINFALL · 24 HOURS"><div className="layers">{[['nwp_mm','Raw NWP'],['global_mm','Global'],['corrected_mm','Pattern-based'],['observation_mm','Generated observations'],['error_mm','Error'],['heavy_probability','Probability']].map(([key,label])=><button key={key} className={layer===key?'selected':''} onClick={()=>setLayer(key)}>{label}</button>)}</div><Map data={data} layer={layer} big night={night}/></Card>}
    {page === 'regimes' && <div className="cols"><Card title="Weather pattern counts" tag="HELD-OUT POINTS">{Object.entries(regimes?.counts??{}).map(([label,count]:any)=><p key={label}>{label}<b className="right">{count}</b></p>)}<hr/><p>Classifier match rate<b className="right">{metrics?(metrics.classifier_accuracy*100).toFixed(1)+'%':'—'}</b></p></Card><Card title="What influenced the pattern result" tag="INPUT IMPORTANCE">{Object.entries(regimes?.importance??{}).sort((a:any,b:any)=>b[1]-a[1]).slice(0,9).map(([label,score]:any)=><p key={label}>{label.replaceAll('_',' ')}<b className="right">{(score*100).toFixed(1)}%</b></p>)}<small>These rankings come from the generated training data.</small></Card></div>}
    {page === 'correction' && <><div className="cols"><Card title="Error by forecast method" tag="LOWER IS BETTER"><ErrorChart chart={chartRows}/></Card><Card title="Pattern-based verification scores"><Stats metrics={metrics}/></Card></div><Card title="A few sample locations" tag="RAINFALL IN MM"><Table rows={data.slice(0,35)}/></Card></>}
    {page === 'alerts' && <><Card title="Heavy-rain threshold"><div className="threshold"><div><b>Show points at or above</b><small>24-hour rainfall amount</small></div><input type="range" min="25" max="150" step="0.5" value={threshold} onChange={event=>setThreshold(+event.target.value)}/><strong>{threshold} mm</strong></div></Card><div className="cols"><Card title="Highest sample probabilities" tag={`${alerts.length} LOCATIONS`}><Table rows={alerts}/></Card><Card title="Heavy-rain chance" tag="GENERATED VALUES"><Map data={data} layer="heavy_probability" night={night}/></Card></div></>}
    {page === 'verification' && <><div className="cols"><Card title="Rainfall error comparison"><ErrorChart chart={chartRows}/></Card><Card title="Heavy-rain scores"><Stats metrics={metrics}/></Card></div><Card title="What the scores mean"><div className="definitions">{[['RMSE','Typical forecast error, with larger errors weighted more'],['MAE','Average absolute rainfall error'],['Bias','Average over- or under-estimate'],['CSI','Hits compared with misses and false alarms'],['ETS','Threat score adjusted for chance hits'],['POD','Share of observed heavy-rain points detected'],['FAR','Share of alerts that were false alarms'],['FSS','Pointwise approximation for this sample grid'],['Brier','Accuracy of heavy-rain probabilities']].map(([name,description])=><div key={name}><b>{name}</b><span>{description}</span></div>)}</div><p className="muted">These scores describe the generated sample set only. They do not show real-world forecast skill.</p></Card></>}
    {page === 'data' && <div className="cols"><Card title="Sample data in this run"><div className="meta-list">{[['Source','Generated by MeghSetu'],['Total rows',metadata?.samples?.toLocaleString()??'—'],['Held-out rows',metadata?.test_samples?.toLocaleString()??'—'],['Input features',metadata?.features?.length??12],['Repeatable seed',metadata?.seed??42],['Created at (UTC)',metadata?.training_timestamp_utc??'—']].map(([label,value]:any)=><div key={label}><span>{label}</span><b>{value}</b></div>)}</div></Card><Card title="Models used"><div className="arch"><div>Rainfall forecast and atmospheric inputs</div><ChevronRight/><div>Weather-pattern classifier</div><ChevronRight/><div>Six pattern-specific correction models</div><ChevronRight/><div>Calibrated heavy-rain probability model</div></div><p className="muted">A general correction model is included as a comparison. The app separates training and evaluation samples.</p></Card></div>}
    {page === 'sources' && <><Card title="Why we built MeghSetu"><p className="bodycopy">We built this SIH 2026 prototype to explore whether correcting rainfall forecasts by weather pattern could give people clearer rainfall guidance.</p><p className="muted">The app generates sample rainfall and weather inputs so the full workflow can be explored without live forecast files. Its results are not operational forecasts.</p></Card><Card title="Sources we referred to"><div className="refs">{[['MOSDAC · ISRO/SAC','https://mosdac.gov.in/'],['Bhuvan · ISRO/NRSC','https://bhuvan.nrsc.gov.in/home/'],['India-WRIS','https://www.india-wris.nrsc.gov.in/'],['PMFBY','https://pmfby.gov.in/'],['NDRF','https://ndrf.gov.in/'],['Allen et al. (2019)','https://doi.org/10.1002/qj.3638'],['Cannon et al. (2015)','https://doi.org/10.1175/JCLI-D-14-00754.1'],['Shi et al. (2017)','https://arxiv.org/abs/1706.03458'],['Allen (2020)','https://doi.org/10.1002/qj.3806']].map(([label,url])=><a key={label} href={url} target="_blank" rel="noreferrer">{label}<span>↗</span></a>)}</div></Card></>}
  </div>;

  return <div className={'app '+(night?'theme-night':'theme-day')}><aside><div className="brand"><img src="/meghsetu-logo.png" alt="MeghSetu — AI-powered rainfall forecasts for a safer India" /></div><label>SIH 2026 · PROJECT</label><nav>{pages.map(({id,label,icon:Icon})=><a href={'#/'+id} className={page===id?'active':''} aria-current={page===id?'page':undefined} key={id}><Icon size={16}/><span>{label}</span></a>)}</nav><div className="footstat"><i/> System ready</div></aside><main><header><div><small>MEGHSETU / {current.label.toUpperCase()}</small><h1>{current.label}</h1></div><div className="head"><span className="sample-badge"><i/> GENERATED SAMPLE DATA · NOT LIVE</span><button className="theme-toggle" onClick={()=>setNight(value=>!value)} aria-pressed={night} title={night?'Switch to day theme':'Switch to night theme'}>{night?<Sun size={16}/>:<Moon size={16}/>}<span>{night?'Day mode':'Night mode'}</span></button><button className="run" onClick={run} disabled={busy}><Play size={14}/>{busy?'Updating…':'Run analysis'}</button></div></header>{error&&<div className="error">{error}<button onClick={load}>Try again</button></div>}{loading&&<div className="loading-strip"><i/> Preparing rainfall sample and model results…</div>}{pageView}<footer>MEGHSETU · GENERATED SAMPLE VALUES <button onClick={load}><RefreshCw size={13}/> Refresh data</button></footer></main></div>;
}
function Card({title,tag,children}:any){return <section className="card"><header><b>{title}</b>{tag&&<small>{tag}</small>}</header>{children}</section>}
function Status({label,value}:any){return <p className="status-line"><span>{label}</span><b>{value}</b></p>}
function ErrorChart({chart}:any){return <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid stroke="#e8eef4" vertical={false}/><XAxis dataKey="model"/><YAxis/><Tooltip/><Legend/><Bar dataKey="RMSE" fill="#087f8c"/><Bar dataKey="MAE" fill="#51b5b5"/></BarChart></ResponsiveContainer></div>}
function Stats({metrics}:any){return <div className="stats">{[['CSI',metrics?.regime_aware?.csi],['ETS',metrics?.regime_aware?.ets],['POD',metrics?.regime_aware?.pod],['FAR',metrics?.regime_aware?.far],['FSS',metrics?.regime_aware?.fss],['Brier',metrics?.brier]].map(([name,value]:any)=><div key={name}><small>{name}</small><b>{value==null?'—':value.toFixed(3)}</b></div>)}</div>}
function Table({rows}:any){return <div className="table"><table><thead><tr>{['Latitude / longitude','Pattern','Raw forecast','Adjusted','Generated observation','Heavy-rain chance'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((point:Point,index:number)=><tr key={index}><td>{point.latitude.toFixed(1)}, {point.longitude.toFixed(1)}</td><td>{point.predicted_regime}</td><td>{point.nwp_mm.toFixed(1)}</td><td>{point.corrected_mm.toFixed(1)}</td><td>{point.observation_mm.toFixed(1)}</td><td>{(point.heavy_probability*100).toFixed(1)}%</td></tr>)}</tbody></table></div>}
function Map({data,layer,big,night}:any){const [tilesDown,setTilesDown]=useState(false);const value=(point:Point)=>layer==='heavy_probability'?point[layer]*100:point[layer];const max=Math.max(1,...data.slice(0,800).map(value));return <div className={'map '+(big?'big ':'')+(night?'night-view ':'')+(tilesDown?'tiles-unavailable':'')}><div className="offline-grid">{data.slice(0,big?450:130).map((point:Point,index:number)=><i key={index} title={point.predicted_regime} style={{left:Math.max(1,Math.min(98,(point.longitude-68)/28*100))+'%',top:Math.max(1,Math.min(98,(35-point.latitude)/27*100))+'%',background:layer==='heavy_probability'?(point.heavy_probability>.55?'#ea580c':point.heavy_probability>.25?'#facc15':'#14b8a6'):layer==='error_mm'?(point.error_mm>0?'#ef4444':'#06b6d4'):'#159b81'}}/>)}</div>{data.length>0?<MapContainer center={[22.5,82.5]} zoom={big?4:3} scrollWheelZoom><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{tileerror:()=>setTilesDown(true),load:()=>setTilesDown(false)}}/>{data.slice(0,big?550:190).map((point:Point,index:number)=>{const amount=value(point);const color=layer==='error_mm'?(amount>0?'#ef4444':'#06b6d4'):layer==='heavy_probability'?(amount>55?'#ea580c':amount>25?'#facc15':'#14b8a6'):'#159b81';return <CircleMarker key={index} center={[point.latitude,point.longitude]} radius={Math.max(2,Math.min(6,2+amount/max*4))} pathOptions={{color,fillColor:color,fillOpacity:.58}}><Popup><b>{point.predicted_regime}</b><br/>Raw {point.nwp_mm.toFixed(1)} mm · Adjusted {point.corrected_mm.toFixed(1)} mm<br/>Generated observation {point.observation_mm.toFixed(1)} mm · Error {point.error_mm.toFixed(1)} mm<br/>Heavy-rain chance {(point.heavy_probability*100).toFixed(1)}%</Popup></CircleMarker>})}</MapContainer>:<div className="map-loading">{`Rainfall points will appear when the service is ready.`}</div>}<label>{layer==='heavy_probability'?'Heavy-rain chance (%)':layer==='error_mm'?'Forecast error (mm)':'Rainfall (mm)'} · sample points</label><div className="map-legend"><i/> Lower <span>→</span> Higher</div></div>}

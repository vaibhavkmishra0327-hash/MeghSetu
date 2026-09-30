import numpy as np
import pandas as pd
REGIMES=['Active Monsoon','Break Monsoon','Monsoon Depression','Orographic Rain','Coastal Convection','Western Disturbance']
def make_data(n=4200,seed=42):
 r=np.random.default_rng(seed); lat=r.uniform(8,35,n); lon=r.uniform(68,96,n); month=r.integers(1,13,n); elevation=np.maximum(0,1500*np.exp(-((lon-87)/4)**2)+500*np.exp(-((lat-30)/5)**2)+r.normal(0,80,n)); humidity=np.clip(48+28*np.sin((month-4)*np.pi/8)+r.normal(0,14,n),15,100); cape=np.maximum(0,250+humidity*17+r.normal(0,500,n)); wind=np.maximum(1,9+12*np.sin((month-3)*np.pi/8)+r.normal(0,6,n)); pressure=1010-.35*wind+r.normal(0,3,n); temperature=29-.45*(lat-15)+r.normal(0,3,n); monsoon=np.clip(np.sin((month-4)*np.pi/8),-1,1); spatial=22*np.exp(-((lat-23)/7)**2)*np.exp(-((lon-83)/11)**2)+12*np.exp(-((lat-28)/5)**2)*np.exp(-((lon-88)/4)**2); obs=np.maximum(0,spatial+(humidity-55)*.75+cape*.018+wind*.45+elevation*.008+monsoon*16+r.gamma(1.8,7,n))
 monsoon=np.clip(np.sin((month-4)*np.pi/8),-1,1)
 regime=np.full(n,'Active Monsoon',dtype=object)
 regime[(month<=3)|(month>=11)]='Western Disturbance'
 regime[(elevation>650)&(lon>78)&(lon<94)]='Orographic Rain'
 regime[((lon<73)|(lon>92))&(humidity>58)]='Coastal Convection'
 regime[(monsoon<-.12)&(lat>17)&(lat<29)]='Break Monsoon'
 regime[(monsoon>.25)&(lat>17)&(lat<29)&(lon>74)&(lon<91)]='Monsoon Depression'
 bias={'Active Monsoon':1.55,'Break Monsoon':.45,'Monsoon Depression':.62,'Orographic Rain':.38,'Coastal Convection':1.82,'Western Disturbance':1.45}; noise_sd=np.array([{'Active Monsoon':5,'Break Monsoon':4,'Monsoon Depression':5,'Orographic Rain':4,'Coastal Convection':6,'Western Disturbance':5}[x] for x in regime]); nwp=np.maximum(0,obs*np.array([bias[x] for x in regime])+r.normal(0,noise_sd,n)+1.5)
 return pd.DataFrame(dict(latitude=lat,longitude=lon,elevation=elevation,month=month,humidity=humidity,cape=cape,wind=wind,pressure=pressure,temperature=temperature,monsoon_index=monsoon,nwp_mm=nwp,observation_mm=obs,regime=regime,lagged_rain_mm=np.maximum(0,obs+r.normal(0,9,n))))

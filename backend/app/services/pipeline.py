from sklearn.ensemble import RandomForestClassifier,RandomForestRegressor,HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error,mean_squared_error,accuracy_score,brier_score_loss
from sklearn.calibration import CalibratedClassifierCV
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
import numpy as np
from app.data.synthetic import make_data,REGIMES
FEATURES=['latitude','longitude','elevation','month','humidity','cape','wind','pressure','temperature','monsoon_index','nwp_mm','lagged_rain_mm']
def fit_demo(seed=42,n=4200):
 d=make_data(n,seed); tr,te=train_test_split(np.arange(n),test_size=.22,random_state=seed,stratify=d.regime); X=d[FEATURES]; clf=make_pipeline(SimpleImputer(),RandomForestClassifier(n_estimators=80,min_samples_leaf=3,class_weight='balanced_subsample',random_state=seed,n_jobs=-1)).fit(X.iloc[tr],d.regime.iloc[tr]); models={}
 for regime in REGIMES:
  ix=tr[d.regime.iloc[tr].to_numpy()==regime]; models[regime]=make_pipeline(SimpleImputer(),RandomForestRegressor(n_estimators=140,min_samples_leaf=1,max_features=1.0,random_state=seed,n_jobs=-1)).fit(X.iloc[ix],(d.observation_mm-d.nwp_mm).iloc[ix])
 glob=make_pipeline(SimpleImputer(),RandomForestRegressor(n_estimators=80,min_samples_leaf=3,random_state=seed,n_jobs=-1)).fit(X.iloc[tr],d.observation_mm.iloc[tr]); heavy=CalibratedClassifierCV(HistGradientBoostingClassifier(max_iter=70,learning_rate=.08,l2_regularization=1,random_state=seed),cv=3,method='sigmoid').fit(X.iloc[tr],(d.observation_mm.iloc[tr]>64.5).astype(int)); regimes=clf.predict(X.iloc[te]); raw=d.nwp_mm.iloc[te].to_numpy(); actual=d.observation_mm.iloc[te].to_numpy(); pred=np.array([d.nwp_mm.iloc[i]+models[a].predict(X.iloc[[i]])[0] for i,a in zip(te,regimes)]).clip(0); gp=glob.predict(X.iloc[te]).clip(0); p=heavy.predict_proba(X.iloc[te])[:,1]
 def score(a):
  event=a>64.5; obs=actual>64.5; hit=(event&obs).sum(); miss=(~event&obs).sum(); false=(event&~obs).sum(); rand=(hit+miss)*(hit+false)/max(1,len(actual)); return {'rmse':float(mean_squared_error(actual,a)**.5),'mae':float(mean_absolute_error(actual,a)),'bias':float(np.mean(a-actual)),'csi':float(hit/max(1,hit+miss+false)),'ets':float((hit-rand)/max(1,hit+miss+false-rand)),'pod':float(hit/max(1,hit+miss)),'far':float(false/max(1,hit+false)),'fss':float(1-((event.mean()-obs.mean())**2)/(event.mean()+obs.mean()+1e-9))}
 rows=d.iloc[te].copy(); rows['predicted_regime']=regimes; rows['global_mm']=gp; rows['corrected_mm']=pred; rows['heavy_probability']=p; rows['error_mm']=pred-actual; return {'df':d,'test':rows,'classifier':clf,'models':models,'global':glob,'heavy':heavy,'metrics':{'raw':score(raw),'global':score(gp),'regime_aware':score(pred),'brier':float(brier_score_loss((actual>64.5).astype(int),p)),'classifier_accuracy':float(accuracy_score(d.regime.iloc[te],regimes))},'importance':dict(zip(FEATURES,clf[-1].feature_importances_.tolist())),'seed':seed}

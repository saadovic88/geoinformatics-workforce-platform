import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { GeofenceZone } from '../../types';
import { MapPin, Plus, Save, CheckCircle, Trash2 } from 'lucide-react';
import { LeafletMap } from '../common/LeafletMap';
import { useAuth } from '../../context/AuthContext';

export const GeofenceSettingsView: React.FC = () => {
  const { geofenceZones, updateGeofenceZone, addGeofenceZone, deleteGeofenceZone } = useData();
  const { t, isRtl } = useLanguage();
  const { isFullAccessUser } = useAuth();
  const activeZones = geofenceZones.filter((zone) => zone.isActive);

  const [activeZoneId, setActiveZoneId] = useState<string>(activeZones[0]?.id || 'zone_cairo_hq');
  const [showAddModal, setShowAddModal] = useState(false);

  // Active zone editing state
  const activeZone = activeZones.find((z) => z.id === activeZoneId) || activeZones[0];
  const [lat, setLat] = useState<number>(activeZone?.latitude || 30.0444);
  const [lon, setLon] = useState<number>(activeZone?.longitude || 31.2357);
  const [radius, setRadius] = useState<number>(activeZone?.radiusMeters || 500);
  const [nameEn, setNameEn] = useState<string>(activeZone?.nameEn || '');
  const [nameAr, setNameAr] = useState<string>(activeZone?.nameAr || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New zone modal state
  const [newZoneNameEn, setNewZoneNameEn] = useState('');
  const [newZoneNameAr, setNewZoneNameAr] = useState('');
  const [newLat, setNewLat] = useState(31.2001);
  const [newLon, setNewLon] = useState(29.9187);
  const [newRadius, setNewRadius] = useState(500);

  const handleSelectZone = (z: GeofenceZone) => {
    setActiveZoneId(z.id);
    setLat(z.latitude);
    setLon(z.longitude);
    setRadius(z.radiusMeters);
    setNameEn(z.nameEn);
    setNameAr(z.nameAr);
  };

  const handleSaveCurrentZone = () => {
    if (!activeZone) return;
    updateGeofenceZone({
      ...activeZone,
      latitude: Number(lat),
      longitude: Number(lon),
      radiusMeters: Number(radius),
      nameEn,
      nameAr,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddZoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneNameEn.trim()) return;

    addGeofenceZone({
      nameEn: newZoneNameEn,
      nameAr: newZoneNameAr || newZoneNameEn,
      latitude: Number(newLat),
      longitude: Number(newLon),
      radiusMeters: Number(newRadius),
      isActive: true,
      isPrimary: false,
    });

    setShowAddModal(false);
    setNewZoneNameEn('');
    setNewZoneNameAr('');
  };

  const handleDeleteZone = () => {
    if (!activeZone || activeZone.isPrimary) return;
    if (!window.confirm(`Deactivate the office zone "${activeZone.nameEn}"? Its record will be retained.`)) return;
    if (!deleteGeofenceZone(activeZone.id)) return;
    const nextZone = activeZones.find((zone) => zone.id !== activeZone.id);
    if (nextZone) handleSelectZone(nextZone);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">{t('navGeofenceSettings')}</h1>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'تحديد إحداثيات مقر الشركة ونصف قطر النطاق الجغرافي (500 متر افتراضياً) والتحكم بالمناطق المعتمدة.'
              : 'Interactive GIS geofence configuration, 500-meter threshold validation, and multi-zone support.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          disabled={!isFullAccessUser}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isRtl ? 'إضافة نطاق فرعي جديد' : 'Add New Office Zone'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{isRtl ? 'تم تحديث إعدادات السياج الجغرافي بنجاح' : 'Geofence zone settings successfully updated.'}</span>
        </div>
      )}

      {/* Zone Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {activeZones.map((z) => (
          <button
            key={z.id}
            onClick={() => handleSelectZone(z)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
              activeZoneId === z.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{isRtl ? z.nameAr : z.nameEn}</span>
            <span className="text-[10px] text-slate-400">({z.radiusMeters}m)</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Interactive Map + Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs">
              {t('dragOrClickMap')}
            </h3>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Radius: {radius} meters
            </span>
          </div>

          <LeafletMap
            zones={[
              {
                ...activeZone,
                latitude: Number(lat),
                longitude: Number(lon),
                radiusMeters: Number(radius),
              },
            ]}
            userLat={Number(lat)}
            userLon={Number(lon)}
            interactive={true}
            onLocationSelect={(newLat, newLon) => {
              setLat(parseFloat(newLat.toFixed(5)));
              setLon(parseFloat(newLon.toFixed(5)));
            }}
            height="380px"
          />
        </div>

        {/* Configuration Parameters */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            {isRtl ? 'بيانات وإحداثيات النطاق' : 'Zone Parameters'}
          </h3>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Zone Name (EN)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              disabled={!isFullAccessUser}
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 disabled:cursor-not-allowed disabled:opacity-60 text-xs font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Zone Name (AR)</label>
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              disabled={!isFullAccessUser}
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 disabled:cursor-not-allowed disabled:opacity-60 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                disabled={!isFullAccessUser}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 disabled:cursor-not-allowed disabled:opacity-60 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                disabled={!isFullAccessUser}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 disabled:cursor-not-allowed disabled:opacity-60 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700">{t('officeRadius')}</label>
              <span className="font-bold text-blue-700 font-mono">{radius}m</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={radius}
              disabled={!isFullAccessUser}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>100m</span>
              <span>Default: 500m</span>
              <span>2000m</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-slate-600 text-[11px]">
            <p className="font-bold text-slate-800">Geofence Policy Rule:</p>
            <p>
              Check-ins beyond <b>{radius}m</b> without an active WFH or Field permit will trigger an
              attendance violation requiring HR review.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveCurrentZone}
              disabled={!isFullAccessUser}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('save')}</span>
            </button>
            {!activeZone?.isPrimary && (
              <button
                onClick={handleDeleteZone}
                disabled={!isFullAccessUser}
                className="mt-2 w-full py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Deactivate this office zone
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Zone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-4 sm:p-6 border border-slate-200 space-y-4 text-xs text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add New Geofence Zone</h3>
              <button onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddZoneSubmit} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Zone Name (EN)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Capital Field Operations Office"
                  value={newZoneNameEn}
                  onChange={(e) => setNewZoneNameEn(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Zone Name (AR)</label>
                <input
                  type="text"
                  placeholder="مكتب العاصمة الإدارية الميداني"
                  value={newZoneNameAr}
                  onChange={(e) => setNewZoneNameAr(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newLat}
                    onChange={(e) => setNewLat(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newLon}
                    onChange={(e) => setNewLon(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  required
                  value={newRadius}
                  onChange={(e) => setNewRadius(parseInt(e.target.value) || 500)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col-reverse min-[420px]:flex-row items-stretch min-[420px]:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Add Office Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

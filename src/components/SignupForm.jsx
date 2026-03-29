import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { GlassCard } from './ui/gaming-login';

const HOSPITALS = [
  'Bakı Şəhər Klinik Xəstəxanası №1',
  'Bakı Şəhər Klinik Xəstəxanası №2',
  'Respublika Klinik Xəstəxanası',
  'Mülki Aviasiya Tibb Mərkəzi',
  // more hospitals will be added
];

const IXTISASLAR = [
  'Həkim-infeksionist',
  'Epidemioloq',
  'Tibb bacısı',
  'Terapevt',
  'Cərrah',
  'Pediatr',
  'Nevroloq',
  'Kardioloq',
];

const VEZIFELER = [
  'Yoluxucu xəstəliklər şöbə müdiri',
  'Həkim-infeksionist',
  'Böyük tibb bacısı',
  'Baş tibb bacısı',
  'Epidemioloq',
  'Terapevt',
];

const inputClass =
  'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500/60 transition-colors text-sm';

const labelClass = 'block text-xs text-white/60 mb-1';

function PasswordStrengthBar({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Çox zəif', 'Zəif', 'Orta', 'Güclü', 'Çox güclü'];
  const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'];

  if (!password) return null;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${i <= score ? colors[score] : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className={`text-xs ${score <= 2 ? 'text-red-400' : score <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
        {labels[score]}
      </p>
      <ul className="text-xs text-white/40 space-y-0.5">
        {!checks[0] && <li>• Ən az 8 simvol</li>}
        {!checks[1] && <li>• Ən az 1 böyük hərf (A-Z)</li>}
        {!checks[2] && <li>• Ən az 1 kiçik hərf (a-z)</li>}
        {!checks[3] && <li>• Ən az 1 rəqəm (0-9)</li>}
        {!checks[4] && <li>• Ən az 1 xüsusi simvol (!@#$ ...)</li>}
      </ul>
    </div>
  );
}

export default function SignupForm({ onSwitch }) {
  const [form, setForm] = useState({
    ad: '',
    soyad: '',
    ataAdi: '',
    email: '',
    password: '',
    confirmPassword: '',
    xesteхana: '',
    xestexanaManual: '',
    ixtisas: '',
    ohdelik: '',
    vezife: '',
  });
  const [hospitalManual, setHospitalManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const isPasswordStrong = (pw) =>
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw);

  const handleHospitalChange = (e) => {
    const val = e.target.value;
    if (val === '__manual__') {
      setHospitalManual(true);
      setForm((f) => ({ ...f, xesteхana: '', xestexanaManual: '' }));
    } else {
      setHospitalManual(false);
      setForm((f) => ({ ...f, xesteхana: val, xestexanaManual: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.ad || !form.soyad || !form.ataAdi) return setError('Ad, soyad və ata adı mütləqdir.');
    if (!isPasswordStrong(form.password)) return setError('Şifrə kifayət qədər güclü deyil.');
    if (form.password !== form.confirmPassword) return setError('Şifrələr uyğun gəlmir.');
    if (!form.ohdelik) return setError('Öhdəlik seçin.');

    const hospitalName = hospitalManual ? form.xestexanaManual : form.xesteхana;
    if (!hospitalName) return setError('Xəstəxana adını daxil edin.');

    setLoading(true);
    try {
      const fullName = `${form.ad} ${form.soyad} ${form.ataAdi}`.trim();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: fullName,
            ad: form.ad,
            soyad: form.soyad,
            ata_adi: form.ataAdi,
            hospital_name: hospitalName,
            ixtisas: form.ixtisas,
            ohdelik: form.ohdelik,
            vezife: form.vezife,
            status: 'pending',
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        const { error: profileError } = await supabase.from('users').insert([{
          id: data.user.id,
          email: form.email,
          full_name: fullName,
          ad: form.ad,
          soyad: form.soyad,
          ata_adi: form.ataAdi,
          hospital_name: hospitalName,
          ixtisas: form.ixtisas,
          ohdelik: form.ohdelik,
          vezife: form.vezife,
          status: 'pending',
        }]);

        if (profileError && profileError.code !== '23505') throw profileError;
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <GlassCard className="w-full max-w-md mx-auto text-center space-y-4 py-6">
        <div className="text-green-400 text-5xl">✓</div>
        <h2 className="text-xl font-semibold text-white">Qeydiyyat tamamlandı!</h2>
        <p className="text-white/60 text-sm">
          Hesabınız yaradıldı. Admin təsdiqindən sonra daxil ola bilərsiniz.
        </p>
        <button onClick={onSwitch} className="text-purple-400 hover:text-purple-300 transition-colors text-sm">
          Daxil ol səhifəsinə qayıt
        </button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-1">İPC Təlim Portalı</h2>
        <p className="text-white/60 text-sm">Yeni hesab yaradın</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Ad / Soyad / Ata adı */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Ad *</label>
            <input type="text" placeholder="Məsələn: Aynur" value={form.ad} onChange={set('ad')} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Soyad *</label>
            <input type="text" placeholder="Məsələn: Məmmədova" value={form.soyad} onChange={set('soyad')} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ata adı *</label>
            <input type="text" placeholder="Məsələn: Əli qızı" value={form.ataAdi} onChange={set('ataAdi')} required className={inputClass} />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className={labelClass}>E-poçt *</label>
          <input type="email" placeholder="example@mail.com" value={form.email} onChange={set('email')} required className={inputClass} />
        </div>

        {/* Password */}
        <div>
          <label className={labelClass}>Şifrə *</label>
          <input type="password" placeholder="Güclü şifrə daxil edin" value={form.password} onChange={set('password')} required className={inputClass} />
          <PasswordStrengthBar password={form.password} />
        </div>

        {/* Confirm Password */}
        <div>
          <label className={labelClass}>Şifrəni təkrar daxil edin *</label>
          <input
            type="password"
            placeholder="Şifrəni təkrarlayın"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            required
            className={`${inputClass} ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-500/60' : ''}`}
          />
          {form.confirmPassword && form.password !== form.confirmPassword && (
            <p className="text-xs text-red-400 mt-1">Şifrələr uyğun gəlmir</p>
          )}
        </div>

        {/* Hospital */}
        <div>
          <label className={labelClass}>Xəstəxana adı *</label>
          <select onChange={handleHospitalChange} defaultValue="" className={`${inputClass} [&>option]:bg-gray-900`}>
            <option value="" disabled>Xəstəxana seçin</option>
            {HOSPITALS.map((h) => <option key={h} value={h}>{h}</option>)}
            <option value="__manual__">Xəstəxanam siyahıda yoxdur</option>
          </select>
          {hospitalManual && (
            <input
              type="text"
              placeholder="Xəstəxananın adını yazın"
              value={form.xestexanaManual}
              onChange={set('xestexanaManual')}
              required
              className={`${inputClass} mt-2`}
            />
          )}
        </div>

        {/* İxtisas */}
        <div>
          <label className={labelClass}>İxtisas *</label>
          <input
            type="text"
            placeholder="Məs: həkim-infeksionist, epidemioloq, tibb bacısı"
            value={form.ixtisas}
            onChange={set('ixtisas')}
            list="ixtisas-list"
            required
            className={inputClass}
          />
          <datalist id="ixtisas-list">
            {IXTISASLAR.map((i) => <option key={i} value={i} />)}
          </datalist>
        </div>

        {/* Öhdəlik */}
        <div>
          <label className={labelClass}>Öhdəlik *</label>
          <div className="flex gap-6">
            {['İPİN həkimi', 'İPİN tibb bacısı'].map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                <input
                  type="radio"
                  name="ohdelik"
                  value={opt}
                  checked={form.ohdelik === opt}
                  onChange={set('ohdelik')}
                  className="accent-purple-500"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Tutduğu vəzifə */}
        <div>
          <label className={labelClass}>Tutduğu vəzifə *</label>
          <input
            type="text"
            placeholder="Məs: Yoluxucu xəstəliklər şöbə müdiri, böyük tibb bacısı"
            value={form.vezife}
            onChange={set('vezife')}
            list="vezife-list"
            required
            className={inputClass}
          />
          <datalist id="vezife-list">
            {VEZIFELER.map((v) => <option key={v} value={v} />)}
          </datalist>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm shadow-lg shadow-purple-500/20"
        >
          {loading ? 'Yüklənir...' : 'Qeydiyyatdan keç'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        Artıq hesabınız var?{' '}
        <button onClick={onSwitch} className="text-purple-400 hover:text-purple-300 transition-colors">
          Daxil ol
        </button>
      </p>
    </GlassCard>
  );
}

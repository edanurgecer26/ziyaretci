import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { createVisitor, getVisitors, checkOutVisitor, updateVisitor, deleteVisitor } from './api';
import type { Ziyaretci, FormState } from './types';
import { API_URL } from './constants';

const hocaListesi = [
  'Prof. Dr. Alper Ekinci',
  'Prof. Dr. Bünyamin Söğüt',
  'Prof. Dr. Mustafa Yurttadur',
  'Prof. Dr. Selçuk Baş',
  'Prof. Dr. Yavuz Çokal',
  'Doç. Dr. Nevzat Çalış',
  'Doç. Dr. Selen Sallan',
  'Doç. Dr. Oğuzhan Kıvrak',
  'Dr. Öğr. Üyesi Adnan Çalışkan',
  'Dr. Öğr. Üyesi Alper Özboyacı',
  'Dr. Öğr. Üyesi Bilal Ezilmez',
  'Dr. Öğr. Üyesi Büşra Kazmaz Tepe',
  'Dr. Öğr. Üyesi Cemal Çelik',
  'Dr. Öğr. Üyesi Emre Alarslan',
  'Dr. Öğr. Üyesi Erkan Solmaz',
  'Dr. Öğr. Üyesi Gülden Poyraz',
  'Dr. Öğr. Üyesi Hatice Yalman Kösealp',
  'Dr. Öğr. Üyesi İsmail Doru',
  'Dr. Öğr. Üyesi Kaan Çelikok',
  'Dr. Öğr. Üyesi Musa Yalman',
  'Dr. Öğr. Üyesi Yakup Toktay',
  'Öğr. Gör. Aziz Yiğit',
  'Öğr. Gör. Dr. Betül Gül Şarsel',
  'Öğr. Gör. Burcu Camgöz',
  'Öğr. Gör. İlknur Altuntaş',
  'Öğr. Gör. Kürşat Can Ateş',
  'Öğr. Gör. Nilüfer Ayhan Uz',
  'Öğr. Gör. Ömer Doğan',
  'Öğr. Gör. Ömür Yıldırım',
  'Öğr. Gör. Sedat Ersöz',
];

const initialForm: FormState = {
  tc: '',
  adSoyad: '',
  telefon: '',
  hoca: '',
};

interface OfflineCheckoutInfo {
  exitTime: string;
  exitGuard: string;
}

function App() {
  // kimlik dogrulama
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('ziyaretci_auth') === 'true';
  });
  const [guardName, setGuardName] = useState<string>(() => {
    return localStorage.getItem('ziyaretci_guard') || '';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

 // isleyis hafıza yonetimi
  type ModalType = 'add' | 'list' | 'checkout' | 'edit' | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | number | null>(null);
  const [ziyaretciListesi, setZiyaretciListesi] = useState<Ziyaretci[]>([]);
  const [sonZiyaretciler, setSonZiyaretciler] = useState<Ziyaretci[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingVisitor, setEditingVisitor] = useState<Ziyaretci | null>(null);
  const [editForm, setEditForm] = useState<FormState>(initialForm);

  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [checkoutSearchText, setCheckoutSearchText] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [message, setMessage] = useState('');
  
  // TC otomatik doldur
  const [autofilled, setAutofilled] = useState(false);

  // Yedekleme sistemi
  const getOfflineCheckouts = useCallback((): Record<string, OfflineCheckoutInfo> => {
    try {
      const data = localStorage.getItem('offline_checkouts_v2');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }, []);

  const saveOfflineCheckout = useCallback((id: string, time: string, guard: string) => {
    try {
      const data = localStorage.getItem('offline_checkouts_v2');
      const checkouts = data ? JSON.parse(data) : {};
      checkouts[id] = { exitTime: time, exitGuard: guard };
      localStorage.setItem('offline_checkouts_v2', JSON.stringify(checkouts));
    } catch (e) {
      console.error('Offline checkout saving failed:', e);
    }
  }, []);

 // verilerle yedekleri birlestirir
  const mergeCheckouts = useCallback((data: Ziyaretci[]): Ziyaretci[] => {
    const offline = getOfflineCheckouts();
    return data.map((z) => {
      const key = z.documentId || z.id.toString();
      if (offline[key]) {
        return { 
          ...z, 
          exitTime: offline[key].exitTime, 
          exitGuard: offline[key].exitGuard 
        };
      }
      return z;
    });
  }, [getOfflineCheckouts]);

  // son 10 ziyaretci 
  const getSonZiyaretciler = useCallback(async () => {
    try {
      const data = await getVisitors();
      const merged = mergeCheckouts(data);
      setSonZiyaretciler(merged.slice(0, 10));
    } catch (error) {
      console.error('Son ziyaretçiler alınamadı:', error);
    }
  }, [mergeCheckouts]);

  // veri getirme
  const listeyiGetir = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await getVisitors();
      const merged = mergeCheckouts(data);
      setZiyaretciListesi(merged);
    } catch (err) {
      console.error('Liste getirme hatası:', err);
      setMessage(
        err instanceof Error ? err.message : 'Ziyaretçi listesi alınamadı.'
      );
    } finally {
      setLoading(false);
    }
  }, [mergeCheckouts]);

 // ilk ekran 
  useEffect(() => {
  const fetchData = async () => {
    if (isAuthenticated) {
      await getSonZiyaretciler();
    }
  };

  fetchData(); // Fonksiyonu burada çağırıyoruz
}, [isAuthenticated, getSonZiyaretciler]);
 // giriş 
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setAuthError('Ad giriniz.');
      return;
    }

    if (password === 'admin123') {
      localStorage.setItem('ziyaretci_auth', 'true');
      localStorage.setItem('ziyaretci_guard', trimmedUser);
      setIsAuthenticated(true);
      setGuardName(trimmedUser);
      setUsername('');
      setPassword('');
    } else {
      setAuthError('Varsayılan Şifre: admin123');
    }
  };

// yetkileri kontrol et 
  const handleLogout = () => {
    localStorage.removeItem('ziyaretci_auth');
    localStorage.removeItem('ziyaretci_guard');
    setIsAuthenticated(false);
    setGuardName('');
    setActiveModal(null);
  };

 // otomatik doldur 
  const handleTcChange = (val: string) => {
    const numericVal = val.replace(/\D/g, ''); // Sadece rakamları al
    setForm((prev) => ({ ...prev, tc: numericVal }));

    // eski kayıtlarda arama yap
    if (numericVal.length === 11) {
      const matches = [...ziyaretciListesi, ...sonZiyaretciler].filter(
        (z) => z.identityNumber === numericVal
      );

      if (matches.length > 0) {
        const sorted = matches.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        const lastRecord = sorted[0];
        const fullAd = `${lastRecord.firstName || ''} ${lastRecord.lastName || ''}`.trim();

        setForm((prev) => ({
          ...prev,
          adSoyad: fullAd,
          telefon: lastRecord.phoneNumber || '',
        }));
        setAutofilled(true);
      } else {
        setAutofilled(false);
      }
    } else {
      setAutofilled(false);
    }
  };
// ziyarteci kaydetme
  const handleKaydet = async () => {
    setMessage('');

    if (!form.tc.trim() || !form.adSoyad.trim() || !form.hoca.trim()) {
      setMessage('TC Kimlik No, Ad Soyad ve Hoca alanları zorunludur.');
      return;
    }

    if (form.tc.length !== 11) {
      setMessage('TC Kimlik No 11 haneli olmalıdır.');
      return;
    }

    const adParcalari = form.adSoyad.trim().split(' ');
    const firstName = adParcalari[0] || '';
    const lastName = adParcalari.slice(1).join(' ') || '';

    const payload = {
      identityNumber: form.tc.trim(),
      firstName,
      lastName,
      phoneNumber: form.telefon.trim(),
      visitedTeacher: form.hoca,
      entryGuard: guardName,
    };

    setLoading(true);

    try {
      // 1. Ziyaretçiyi oluştur veya zaten varsa mevcut bilgileri al
      const visitor = await createVisitor(payload);
      
      // 2. Şimdi ziyaret kaydını (log) oluştur!
      await fetch(`${API_URL}/visit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            visitDate: new Date().toISOString(),
            visitor: visitor.id, // İlişki burada kuruluyor!
            visitedTeacher: payload.visitedTeacher, // İhtiyaca göre ekleyebilirsin
            entryGuard: payload.entryGuard
          }
        })
      });

      setForm(initialForm);
      setAutofilled(false);
      setActiveModal(null);

      // yenileme
      await getSonZiyaretciler();
      alert('Ziyaretçi ve ziyaret kaydı başarıyla oluşturuldu.');
    } catch (err) {
      console.error('Kayıt hatası:', err);
      // Backend hatası durumunda yerel işlem (simülasyon)
      alert('Bir hata oluştu, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Düzenleme butonuna tıklanınca tetiklenir
  const handleEditClick = (visitor: Ziyaretci) => {
    setEditingVisitor(visitor);
    setEditForm({
      tc: visitor.identityNumber || '',
      adSoyad: `${visitor.firstName || ''} ${visitor.lastName || ''}`.trim(),
      telefon: visitor.phoneNumber || '',
      hoca: visitor.visitedTeacher || '',
    });
    setActiveModal('edit');
  };

  // Düzenlenen bilgileri kaydetme
  const handleUpdate = async () => {
    if (!editingVisitor) return;
    setMessage('');

    if (!editForm.tc.trim() || !editForm.adSoyad.trim() || !editForm.hoca.trim()) {
      setMessage('TC Kimlik No, Ad Soyad ve Hoca alanları zorunludur.');
      return;
    }

    if (editForm.tc.length !== 11) {
      setMessage('TC Kimlik No 11 haneli olmalıdır.');
      return;
    }

    const adParcalari = editForm.adSoyad.trim().split(' ');
    const firstName = adParcalari[0] || '';
    const lastName = adParcalari.slice(1).join(' ') || '';

    const payload = {
      identityNumber: editForm.tc.trim(),
      firstName,
      lastName,
      phoneNumber: editForm.telefon.trim(),
      visitedTeacher: editForm.hoca,
    };

    setLoading(true);
    const key = editingVisitor.documentId || editingVisitor.id.toString();

    try {
      const updated = await updateVisitor(key, payload);
      
      const updateInList = (list: Ziyaretci[]) =>
        list.map((z) => (z.documentId === editingVisitor.documentId || z.id === editingVisitor.id ? { ...z, ...updated } : z));
      
      setZiyaretciListesi(updateInList);
      setSonZiyaretciler(updateInList);

      setEditingVisitor(null);
      setActiveModal('list');
      alert('Ziyaretçi başarıyla güncellendi.');
    } catch (err) {
      console.error('Güncelleme hatası:', err);
      
      // veriyi tarayiciya kaydetmek
      const simulatedUpdated: Ziyaretci = {
        ...editingVisitor,
        identityNumber: payload.identityNumber,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phoneNumber: payload.phoneNumber,
        visitedTeacher: payload.visitedTeacher,
      };
      
      const updateInList = (list: Ziyaretci[]) =>
        list.map((z) => (z.documentId === editingVisitor.documentId || z.id === editingVisitor.id ? simulatedUpdated : z));

      setZiyaretciListesi(updateInList);
      setSonZiyaretciler(updateInList);

      setEditingVisitor(null);
      setActiveModal('list');
      alert('Backend bağlantısı kurulamadı. Ziyaretçi tarayıcı hafızasında güncellendi.');
    } finally {
      setLoading(false);
    }
  };

  // Silme işlemi
  const handleDeleteClick = async (visitor: Ziyaretci) => {
    const confirmDelete = window.confirm(
      `${visitor.firstName} ${visitor.lastName} isimli ziyaretçiyi silmek istediğinize emin misiniz?`
    );
    if (!confirmDelete) return;

    setLoading(true);
    const key = visitor.documentId || visitor.id.toString();

    try {
      await deleteVisitor(key);

      const filterOut = (list: Ziyaretci[]) =>
        list.filter((z) => !(z.documentId === visitor.documentId || z.id === visitor.id));

      setZiyaretciListesi(filterOut);
      setSonZiyaretciler(filterOut);

      alert('Ziyaretçi başarıyla silindi.');
    } catch (err) {
      console.error('Silme hatası:', err);
      
      const filterOut = (list: Ziyaretci[]) =>
        list.filter((z) => !(z.documentId === visitor.documentId || z.id === visitor.id));

      setZiyaretciListesi(filterOut);
      setSonZiyaretciler(filterOut);

      alert('Backend bağlantısı kurulamadı. Ziyaretçi tarayıcı hafızasından silindi.');
    } finally {
      setLoading(false);
    }
  };

 // ziyaretci cikis
  const handleVisitorCheckout = async (visitor: Ziyaretci) => {
    setLoading(true);
    setMessage('');
    const key = visitor.documentId || visitor.id.toString();
    const timeNow = new Date().toISOString();

    try {
     // yetkilikisi kim 
      await checkOutVisitor(key, guardName);
      
      
      setZiyaretciListesi((prev) =>
        prev.map((z) =>
          z.documentId === visitor.documentId || z.id === visitor.id
            ? { ...z, exitTime: timeNow, exitGuard: guardName }
            : z
        )
      );
      setSonZiyaretciler((prev) =>
        prev.map((z) =>
          z.documentId === visitor.documentId || z.id === visitor.id
            ? { ...z, exitTime: timeNow, exitGuard: guardName }
            : z
        )
      );
      
      alert(`${visitor.firstName} ${visitor.lastName} başarıyla çıkış yaptı.`);
    } catch (err) {
      console.error('Çıkış API Hatası:', err);
      
      saveOfflineCheckout(key, timeNow, guardName);
      
     
      setZiyaretciListesi((prev) =>
        prev.map((z) =>
          z.documentId === visitor.documentId || z.id === visitor.id
            ? { ...z, exitTime: timeNow, exitGuard: guardName }
            : z
        )
      );
      setSonZiyaretciler((prev) =>
        prev.map((z) =>
          z.documentId === visitor.documentId || z.id === visitor.id
            ? { ...z, exitTime: timeNow, exitGuard: guardName }
            : z
        )
      );

      alert(`${visitor.firstName} ${visitor.lastName} çıkışı tarayıcı belleğine kaydedildi.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutAc = async () => {
    setCheckoutSearchText('');
    setActiveModal('checkout');
    await listeyiGetir();
  };

// tum ziyaretciler penceresi 
  const handleListeAc = async () => {
    setActiveModal('list');
    await listeyiGetir();
  };

 
  const iceridekiZiyaretciler = useMemo(() => {
    return ziyaretciListesi.filter((z) => {
      const isInside = !z.exitTime;
      
      const fullName = `${z.firstName || ''} ${z.lastName || ''}`.toLocaleLowerCase('tr-TR');
      const search = checkoutSearchText.toLocaleLowerCase('tr-TR');
      const matchesSearch = fullName.includes(search);

      return isInside && matchesSearch;
    });
  }, [ziyaretciListesi, checkoutSearchText]);

  const filtrelenmisZiyaretciler = useMemo(() => {
    return ziyaretciListesi.filter((z) => {
      const fullName = `${z.firstName || ''} ${z.lastName || ''}`.toLocaleLowerCase('tr-TR');
      const tc = (z.identityNumber || '').toLocaleLowerCase('tr-TR');
      const phone = (z.phoneNumber || '').toLocaleLowerCase('tr-TR');
      const teacher = (z.visitedTeacher || '').toLocaleLowerCase('tr-TR');
      const search = searchText.toLocaleLowerCase('tr-TR');

      const textMatch =
        fullName.includes(search) ||
        tc.includes(search) ||
        phone.includes(search) ||
        teacher.includes(search);

      const teacherMatch =
        selectedTeacher === '' || z.visitedTeacher === selectedTeacher;

      return textMatch && teacherMatch;
    });
  }, [ziyaretciListesi, searchText, selectedTeacher]);

  const formatDate = (date?: string) => {
    if (!date) return '-';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return '-';
    }
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(parsedDate);
  };

 // giris ekrani 
  if (!isAuthenticated) {
    return (
      <div className="loginWrapper">
        <div className="loginCard">
          <div className="logo">B</div>
          <h2>Bandırma MYO</h2>
          <p>Ziyaretçi Yönetim Sistemi Yetkili Girişi</p>
          
          {authError && <div className="messageBox">{authError}</div>}
          
          <form className="loginForm" onSubmit={handleLogin}>
            <div className="inputGroup">
              <label htmlFor="username">Ad Soyad (Görevli)</label>
              <input
                id="username"
                type="text"
                value={username}
                placeholder="Görevlinin adını ve soyadını girin"
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="inputGroup">
              <label htmlFor="password">Şifre</label>
              <div className="passwordWrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="Sistem şifresini girin (admin123)"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="passwordToggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
            
            <button type="submit" className="loginButton">
              Giriş Yap 
            </button>
          </form>
        </div>
      </div>
    );
  }

  //Giris yapılmıssa ana yonetim panelini yapılmamıssa giris ekranini goster
  return (
    <div className="app">
      <header className="topBar">
        <div className="brand">
          <span className="brandMark">B</span>
          <div>
            <strong>Bandırma MYO</strong>
            <small>Ziyaretçi Yönetim Paneli</small>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Nöbetçi Görevli: <strong style={{ color: 'white' }}>{guardName}</strong>
          </span>
          <nav>
            <button onClick={() => setActiveModal('add')}>Yeni Kayıt</button>
            <button onClick={handleCheckoutAc}>Ziyaretçi Çıkış</button>
            <button onClick={handleListeAc}>Kayıtlar</button>
            <button className="navLogoutBtn" onClick={handleLogout}>Oturumu Kapat</button>
          </nav>
        </div>
      </header>

      <main className="page">
        <section className="heroLuxury">
          <p className="eyebrow">Bilgisayar Programcılığı</p>
          <h1>
            Bandırma Meslek Yüksekokulu
            <br />
            Ziyaretçi Takip Sistemi
          </h1>

          <div className="heroButtons">
            <button className="blackButton" onClick={() => setActiveModal('add')}>
              Yeni Ziyaretçi Kaydı
            </button>
            <button className="whiteButton" onClick={handleCheckoutAc}>
              Ziyaretçi Çıkış Yap
            </button>
            <button className="whiteButton" onClick={handleListeAc}>
              Kayıtları Listele
            </button>
            <button className="dangerButton" onClick={handleLogout}>
              Oturumu Kapat
            </button>
          </div>
        </section>

        <section className="summaryGrid"/>
          <div className="summaryCard">
            <span>Akademik Personel</span>
            <strong>{hocaListesi.length}</strong>
            <p>Kayıtlı ziyaret edilebilir hoca</p>
          </div>

          <div className="summaryCard">
            <span>Son Kayıtlar</span>
            <strong>{sonZiyaretciler.length}</strong>
            <p>Ana ekranda gösterilen son ziyaretçiler</p>
          </div>

        <section className="recentSection">
          <div className="sectionTitle">
            <div>
              <p className="eyebrow dark">Recent Visitors</p>
              <h2>Gelen Son 10 Ziyaretçi</h2>
            </div>

            <button className="textButton" onClick={getSonZiyaretciler}>
              Yenile
            </button>
          </div>

          {sonZiyaretciler.length === 0 ? (
            <div className="emptyState"> Kayıtlı ziyaretçi bulunmuyor.</div>
          ) : (
            <div className="recentList">
              {sonZiyaretciler.map((z) => (
                <div className="recentCard" key={z.documentId || z.id}>
                  <div>
                    <strong>
                      {z.firstName || '-'} {z.lastName || ''}
                    </strong>
                    <p>Ziyaret Edilen: {z.visitedTeacher || '-'}</p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                      <span className={`badge ${z.exitTime ? 'exited' : 'inside'}`}>
                        {z.exitTime ? `Çıkış: ${formatDate(z.exitTime)}` : 'İçeride'}
                      </span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                        Giriş Kaydı: {z.entryGuard || 'Sistem'}
                      </span>
                      {z.exitTime && (
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                          Çıkış Kaydı: {z.exitGuard || 'Sistem'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="recentRightSection">
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Giriş: {formatDate(z.createdAt)}
                    </span>
                    <div className="recentCardActions">
                      <button className="actionBtn edit" onClick={() => handleEditClick(z)} title="Düzenle">
                         Düzenle
                      </button>
                      <button className="actionBtn delete" onClick={() => handleDeleteClick(z)} title="Sil">
                         Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

    {/* yeni ziyaretci kaydi */}

      {activeModal === 'add' && (
        <div className="modalOverlay">
          <section className="modalPanel">
            <div className="modalTop">
              <div>
                <p className="eyebrow dark">New Visitor</p>
                <h2>Yeni Ziyaretçi Kaydı</h2>
              </div>
              <button className="closeButton" onClick={() => { setActiveModal(null); setAutofilled(false); }}>
                ×
              </button>
            </div>

            {message && <div className="messageBox">{message}</div>}

            <div className="formArea">
              <label>
                TC Kimlik No
                <input
                  type="text"
                  maxLength={11}
                  value={form.tc}
                  placeholder="TC Kimlik No (11 hane)"
                  onChange={(e) => handleTcChange(e.target.value)}
                />
                {autofilled && (
                  <span className="autofillIndicator">
                    Kayıtlı ziyaretçi
                  </span>
                )}
              </label>

              <label>
                Kimi Ziyarete Geldi
                <select
                  value={form.hoca}
                  onChange={(e) => setForm({ ...form, hoca: e.target.value })}
                >
                  <option value="">Hoca seçiniz</option>
                  {hocaListesi.map((hoca) => (
                    <option key={hoca} value={hoca}>
                      {hoca}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Ad Soyad
                <input
                  value={form.adSoyad}
                  placeholder="Ad Soyad"
                  onChange={(e) => setForm({ ...form, adSoyad: e.target.value })}
                />
              </label>

              <label>
                Telefon
                <input
                  value={form.telefon}
                  placeholder="Telefon"
                  onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                />
              </label>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Kayıt Yapan Görevli: <strong style={{ color: 'white' }}>{guardName}</strong>
            </div>

            <div className="modalActions">
              <button className="whiteButton" onClick={() => { setActiveModal(null); setAutofilled(false); }}>
                Vazgeç
              </button>
              <button className="blackButton" onClick={handleKaydet} disabled={loading}>
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ziyaretci cikis ekrani*/}
      {activeModal === 'checkout' && (
        <div className="modalOverlay">
          <section className="modalPanel listPanel">
            <div className="modalTop">
              <div>
                <p className="eyebrow dark">Checkout Board</p>
                <h2>Ziyaretçi Çıkış Ekranı</h2>
              </div>
              <button className="closeButton" onClick={() => setActiveModal(null)}>
                ×
              </button>
            </div>

            {message && <div className="messageBox">{message}</div>}

            <div className="filterBar">
              <input
                value={checkoutSearchText}
                placeholder="Ziyaretçi ara..."
                onChange={(e) => setCheckoutSearchText(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="listInfo">
              <span>
                İçerideki Ziyaretçiler: <strong>{iceridekiZiyaretciler.length}</strong>
              </span>
              <button className="textButton" onClick={listeyiGetir}>
                Yenile
              </button>
            </div>

            {loading ? (
              <div className="emptyState">Yükleniyor...</div>
            ) : iceridekiZiyaretciler.length === 0 ? (
              <div className="emptyState">
                İçeride kayıtlı ziyaretçi bulunmuyor veya arama sonucu boş.
              </div>
            ) : (
              <div className="checkoutList">
                {iceridekiZiyaretciler.map((z) => (
                  <div className="checkoutRow" key={z.documentId || z.id}>
                    <div className="checkoutInfo">
                      <h4>{z.firstName || '-'} {z.lastName || ''}</h4>
                      <p>Kimi Ziyarete Geldi: {z.visitedTeacher || '-'}</p>
                      <p>Giriş: {formatDate(z.createdAt)} | Kayıt Görevlisi: {z.entryGuard || 'Sistem'}</p>
                    </div>
                    <button onClick={() => handleVisitorCheckout(z)} disabled={loading}>
                      Çıkış Yap
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Çıkış Yapan Görevli Olarak Kaydedilecek: <strong style={{ color: 'white' }}>{guardName}</strong>
            </div>

            <div className="modalActions">
              <button className="blackButton" onClick={() => setActiveModal(null)}>
                Kapat
              </button>
            </div>
          </section>
        </div>
      )}

      {/* kayitler listesi */}
      {activeModal === 'list' && (
        <div className="modalOverlay">
          <section className="modalPanel listPanel">
            <div className="modalTop">
              <div>
                <p className="eyebrow dark">Visitor List</p>
                <h2>Ziyaretçi Kayıtları</h2>
              </div>
              <button className="closeButton" onClick={() => setActiveModal(null)}>
                ×
              </button>
            </div>

            {message && <div className="messageBox">{message}</div>}

            <div className="filterBar">
              <input
                value={searchText}
                placeholder="TC, ad soyad, telefon veya hoca ara..."
                onChange={(e) => setSearchText(e.target.value)}
              />

              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
              >
                <option value="">Tüm Hocalar</option>
                {hocaListesi.map((hoca) => (
                  <option key={hoca} value={hoca}>
                    {hoca}
                  </option>
                ))}
              </select>

              <button
                className="whiteButton"
                onClick={() => {
                  setSearchText('');
                  setSelectedTeacher('');
                }}
              >
                Filtreleri Temizle
              </button>
            </div>

            <div className="listInfo">
              <span>
                Gösterilen kayıt: <strong>{filtrelenmisZiyaretciler.length}</strong>
              </span>
              <button className="textButton" onClick={listeyiGetir}>
                Listeyi Yenile
              </button>
            </div>

            {loading ? (
              <div className="emptyState">Kayıtlar yükleniyor...</div>
            ) : filtrelenmisZiyaretciler.length === 0 ? (
              <div className="emptyState">
                Aradığınız kritere uygun kayıt bulunamadı.
              </div>
            ) : (
              <div className="tableWrapper">
                <table>
                  <thead>
                    <tr>
                      <th>TC</th>
                      <th>Ad Soyad</th>
                      <th>Telefon</th>
                      <th>Kimi Ziyarete Geldi?</th>
                      <th>Giriş Saati</th>
                      <th>Giriş Görevlisi</th>
                      <th>Çıkış Saati</th>
                      <th>Çıkış Görevlisi</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrelenmisZiyaretciler.map((z) => (
                      <tr key={z.documentId || z.id}>
                        <td>{z.identityNumber || '-'}</td>
                        <td>
                          {z.firstName || '-'} {z.lastName || ''}
                        </td>
                        <td>{z.phoneNumber || '-'}</td>
                        <td>{z.visitedTeacher || '-'}</td>
                        <td>{formatDate(z.createdAt)}</td>
                        <td>{z.entryGuard || '-'}</td>
                        <td>
                          {z.exitTime ? (
                            <span style={{ color: 'var(--success)' }}>
                              {formatDate(z.exitTime)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                              İçeride
                            </span>
                          )}
                        </td>
                        <td>{z.exitGuard || '-'}</td>
                        <td>
                          <div 
                            className="dropdownContainer"
                            onMouseLeave={() => setActiveDropdown(null)}
                          >
                            <button 
                              className="dropdownToggle"
                              onClick={() => setActiveDropdown(activeDropdown === (z.documentId || z.id) ? null : (z.documentId || z.id))}
                            >
                              İşlemler ▾
                            </button>
                            {activeDropdown === (z.documentId || z.id) && (
                              <div className="dropdownMenu">
                                <button 
                                  className="dropdownItem edit" 
                                  onClick={() => { handleEditClick(z); setActiveDropdown(null); }}
                                >
                                   Düzenle
                                </button>
                                <button 
                                  className="dropdownItem delete" 
                                  onClick={() => { handleDeleteClick(z); setActiveDropdown(null); }}
                                >
                                   Sil
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modalActions">
              <button className="blackButton" onClick={() => setActiveModal(null)}>
                Kapat
              </button>
            </div>
          </section>
        </div>
      )}

      {activeModal === 'edit' && editingVisitor && (
        <div className="modalOverlay">
          <section className="modalPanel">
            <div className="modalTop">
              <div>
                <p className="eyebrow dark">Edit Visitor</p>
                <h2>Ziyaretçi Bilgilerini Düzenle</h2>
              </div>
              <button className="closeButton" onClick={() => { setActiveModal('list'); setEditingVisitor(null); }}>
                ×
              </button>
            </div>

            {message && <div className="messageBox">{message}</div>}

            <div className="formArea">
              <label>
                TC Kimlik No
                <input
                  type="text"
                  maxLength={11}
                  value={editForm.tc}
                  placeholder="TC Kimlik No (11 hane)"
                  onChange={(e) => setEditForm({ ...editForm, tc: e.target.value.replace(/\D/g, '') })}
                />
              </label>

              <label>
                Kimi Ziyarete Geldi?
                <select
                  value={editForm.hoca}
                  onChange={(e) => setEditForm({ ...editForm, hoca: e.target.value })}
                >
                  <option value="">Hoca seçiniz</option>
                  {hocaListesi.map((hoca) => (
                    <option key={hoca} value={hoca}>
                      {hoca}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Ad Soyad
                <input
                  value={editForm.adSoyad}
                  placeholder="Ad Soyad"
                  onChange={(e) => setEditForm({ ...editForm, adSoyad: e.target.value })}
                />
              </label>

              <label>
                Telefon
                <input
                  value={editForm.telefon}
                  placeholder="Telefon"
                  onChange={(e) => setEditForm({ ...editForm, telefon: e.target.value })}
                />
              </label>
            </div>

            <div className="modalActions">
              <button className="whiteButton" onClick={() => { setActiveModal('list'); setEditingVisitor(null); }}>
                Vazgeç
              </button>
              <button className="blackButton" onClick={handleUpdate} disabled={loading}>
                {loading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
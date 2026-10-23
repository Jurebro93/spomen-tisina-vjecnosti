import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CreditCard, User, Calendar, MapPin, FileText, Search, Plus, X } from 'lucide-react';
import { SEOHelmet } from '@/hooks/useSEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { formatLifespan, formatObituaryDate, formatObituaryLocation, calculateObituaryAge } from '@/lib/utils';
import { ageLabel } from '@/lib/hr';

const ObjaviOsmrtnicu = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [obituaries, setObituaries] = useState<any[]>([]);
  const [filteredObituaries, setFilteredObituaries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoadingObituaries, setIsLoadingObituaries] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ime: '',
    prezime: '',
    datum_rodenja: '',
    datum_smrti: '',
    mjesto_rodenja: '',
    mjesto_smrti: '',
    profesija: '',
    podnaslov: '',
    biografija: '',
    fotografija_url: '',
    groblje: '',
    datum_ukopa: '',
    vrijeme_ukopa: '',
    ozalosceni: '',
    mjesna_zajednica: '',
    kontakt_osoba_ime: '',
    kontakt_osoba_email: '',
    kontakt_osoba_telefon: ''
  });
  
  const [contactPersons, setContactPersons] = useState([
    { ime: '', email: '', telefon: '' }
  ]);

  useEffect(() => {
    fetchObituaries();
  }, []);

  useEffect(() => {
    filterObituaries();
  }, [searchTerm, obituaries]);

  const fetchObituaries = async () => {
    try {
      const { data, error } = await supabase
        .from('obituaries')
        .select('id, ime, prezime, datum_rodenja, datum_smrti, datum_ukopa, mjesto_rodenja, mjesto_smrti, biografija, fotografija_url, profesija, slug')
        .eq('active', true)
        .order('datum_ukopa', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching obituaries:', error);
      } else {
        setObituaries(data || []);
      }
    } catch (error) {
      console.error('Error fetching obituaries:', error);
    } finally {
      setIsLoadingObituaries(false);
    }
  };

  const filterObituaries = () => {
    if (!searchTerm) {
      setFilteredObituaries(obituaries);
    } else {
      const filtered = obituaries.filter(obituary =>
        obituary.ime.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obituary.prezime.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredObituaries(filtered);
    }
  };

  const formatDate = (dateString: string) => formatObituaryDate(dateString) ?? '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type - expand support for more formats
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
      
      if (!file.type.startsWith('image/') && !isHeic) {
        toast({
          title: "Greška",
          description: "Molimo odaberite sliku.",
          variant: "destructive"
        });
        return;
      }

      // Check for HEIC format specifically
      if (isHeic) {
        toast({
          title: "Upozorenje",
          description: "HEIC format može imati problema s prikazom. Preporučujemo pretvaranje u JPG ili PNG format.",
          variant: "default"
        });
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Greška", 
          description: "Slika je prevelika. Maksimalna veličina je 5MB.",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview with better error handling
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setImagePreview(result);
        } else {
          toast({
            title: "Greška",
            description: "Nije moguće učitati pretpregled slike. Molimo pokušajte s drugim formatom.",
            variant: "destructive"
          });
        }
      };
      reader.onerror = () => {
        toast({
          title: "Greška",
          description: "Greška pri učitavanju slike. Molimo pokušajte s drugim formatom (JPG, PNG).",
          variant: "destructive"
        });
        setSelectedFile(null);
        setImagePreview(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.split(',')[1];
      if (!base64) reject(new Error('Fotografiju nije moguće pripremiti za slanje.'));
      else resolve(base64);
    };
    reader.onerror = () => reject(new Error('Fotografiju nije moguće učitati.'));
    reader.readAsDataURL(file);
  });

  const handleContactPersonChange = (index: number, field: string, value: string) => {
    setContactPersons(prev => 
      prev.map((person, i) => 
        i === index ? { ...person, [field]: value } : person
      )
    );
  };

  const addContactPerson = () => {
    if (contactPersons.length < 3) {
      setContactPersons(prev => [...prev, { ime: '', email: '', telefon: '' }]);
    }
  };

  const removeContactPerson = (index: number) => {
    if (contactPersons.length > 1) {
      setContactPersons(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      const requiredFields = ['ime', 'prezime', 'datum_rodenja', 'datum_smrti', 'mjesto_rodenja', 'mjesto_smrti'];
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
      
      // Validate first contact person
      if (!contactPersons[0]?.ime || !contactPersons[0]?.email) {
        missingFields.push('kontakt osoba');
      }
      
      if (missingFields.length > 0) {
        throw new Error(`Molimo unesite sva potrebna polja: ${missingFields.join(', ')}`);
      }

      // Prepare obituary data with contact persons
      const obituaryData = {
        ...formData,
        // A user-provided URL is still supported when no file is selected.
        fotografija_url: selectedFile ? '' : formData.fotografija_url,
        // Keep old fields for backward compatibility
        kontakt_osoba_ime: contactPersons[0]?.ime || '',
        kontakt_osoba_email: contactPersons[0]?.email || '',
        kontakt_osoba_telefon: contactPersons[0]?.telefon || '',
        // Add new contact persons array
        kontakt_osobe: contactPersons.filter(person => person.ime && person.email)
      };

      // Submit obituary for admin approval (no payment)
      const photoUpload = selectedFile ? {
        data: await fileToBase64(selectedFile),
        contentType: selectedFile.type,
        fileName: selectedFile.name,
      } : null;

      const { data, error } = await supabase.functions.invoke('submit-obituary', {
        body: { obituaryData, photoUpload }
      });

      if (error) throw error;

      toast({
        title: 'Poslano na odobrenje',
        description: 'Vaša osmrtnica je zaprimljena i bit će objavljena nakon odobrenja.',
      });

      // Reset form
      setFormData({
        ime: '',
        prezime: '',
        datum_rodenja: '',
        datum_smrti: '',
        mjesto_rodenja: '',
        mjesto_smrti: '',
        profesija: '',
        podnaslov: '',
        biografija: '',
        fotografija_url: '',
        groblje: '',
        datum_ukopa: '',
        vrijeme_ukopa: '',
        ozalosceni: '',
        mjesna_zajednica: '',
        kontakt_osoba_ime: '',
        kontakt_osoba_email: '',
        kontakt_osoba_telefon: ''
      });
      setContactPersons([{ ime: '', email: '', telefon: '' }]);
      setSelectedFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Error creating obituary payment:', error);
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Dogodila se greška pri kreiranju plaćanja",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet pagePath="/objavi-osmrtnicu" />
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-border shadow-memorial">
            <CardHeader className="text-center p-4 sm:p-6">
              {/* The page's only heading; as CardTitle (h3) the page had no H1. */}
              <h1 className="text-xl sm:text-2xl font-semibold leading-none tracking-tight text-foreground">
                Objavi osmrtnicu
              </h1>
              <CardDescription className="text-muted-foreground text-sm sm:text-base">
                Besplatna objava — nakon slanja ide na odobrenje administratora.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="text-memorial-gold" size={20} />
                    <h3 className="font-semibold text-foreground">Podaci o pokojniku</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ime">Ime *</Label>
                      <Input
                        id="ime"
                        name="ime"
                        value={formData.ime}
                        onChange={handleInputChange}
                        required
                        placeholder="Ime pokojnika"
                      />
                    </div>
                    <div>
                      <Label htmlFor="prezime">Prezime *</Label>
                      <Input
                        id="prezime"
                        name="prezime"
                        value={formData.prezime}
                        onChange={handleInputChange}
                        required
                        placeholder="Prezime pokojnika"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="profesija">Profesija</Label>
                      <Input
                        id="profesija"
                        name="profesija"
                        value={formData.profesija}
                        onChange={handleInputChange}
                        placeholder="Profesija pokojnika"
                      />
                    </div>
                    <div>
                      <Label htmlFor="podnaslov">Podnaslov</Label>
                      <Input
                        id="podnaslov"
                        name="podnaslov"
                        value={formData.podnaslov}
                        onChange={handleInputChange}
                        placeholder="npr. 'Voljeni otac i suprug'"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="ozalosceni">Ožalošćeni</Label>
                    <Textarea
                      id="ozalosceni"
                      name="ozalosceni"
                      value={formData.ozalosceni}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Lista ozalošćenih članova obitelji (odvojeno zarezima)"
                    />
                  </div>
                </div>

                {/* Funeral Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="text-memorial-gold" size={20} />
                    <h3 className="font-semibold text-foreground">Podaci o sprovodu</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="groblje">Groblje</Label>
                      <Input
                        id="groblje"
                        name="groblje"
                        value={formData.groblje}
                        onChange={handleInputChange}
                        placeholder="Naziv groblja"
                      />
                    </div>
                    <div>
                      <Label htmlFor="datum_ukopa">Datum ukopa</Label>
                      <Input
                        id="datum_ukopa"
                        name="datum_ukopa"
                        type="datetime-local"
                        value={formData.datum_ukopa}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="text-memorial-gold" size={20} />
                    <h3 className="font-semibold text-foreground">Datumi</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="datum_rodenja">Datum rođenja *</Label>
                      <Input
                        id="datum_rodenja"
                        name="datum_rodenja"
                        type="date"
                        value={formData.datum_rodenja}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="datum_smrti">Datum smrti *</Label>
                      <Input
                        id="datum_smrti"
                        name="datum_smrti"
                        type="date"
                        value={formData.datum_smrti}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Places */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="text-memorial-gold" size={20} />
                    <h3 className="font-semibold text-foreground">Mjesta</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mjesto_rodenja">Mjesto rođenja *</Label>
                      <Input
                        id="mjesto_rodenja"
                        name="mjesto_rodenja"
                        value={formData.mjesto_rodenja}
                        onChange={handleInputChange}
                        required
                        placeholder="Mjesto rođenja"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mjesto_smrti">Mjesto ukopa</Label>
                      <Input
                        id="mjesto_smrti"
                        name="mjesto_smrti"
                        value={formData.mjesto_smrti}
                        onChange={handleInputChange}
                        required
                        placeholder="Mjesto ukopa"
                      />
                    </div>
                  </div>
                </div>

                {/* Biography and Photo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="text-memorial-gold" size={20} />
                    <h3 className="font-semibold text-foreground">Dodatne informacije</h3>
                  </div>
                  
                  <div>
                    <Label htmlFor="biografija">Biografija</Label>
                    <Textarea
                      id="biografija"
                      name="biografija"
                      value={formData.biografija}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Kratka biografija pokojnika (neobavezno)"
                    />
                  </div>
                  
                  {/* File Upload Section */}
                  <div>
                    <Label htmlFor="photo_upload">Fotografija pokojnika</Label>
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          id="photo_upload"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,.heic,.heif"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-muted/50 border border-border rounded-md cursor-pointer hover:bg-muted/70 transition-colors">
                          <Upload size={16} />
                          <span className="text-sm text-foreground">Prenesi fotografiju</span>
                        </div>
                      </div>
                      {imagePreview && (
                        <div className="relative w-32 h-40 mx-auto">
                          <img 
                            src={imagePreview} 
                            alt="Pretpregled fotografije" 
                            className="w-full h-full object-cover rounded-lg border-2 border-border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                            onClick={() => {
                              setSelectedFile(null);
                              setImagePreview(null);
                            }}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="fotografija_url">ili URL fotografije</Label>
                    <Input
                      id="fotografija_url"
                      name="fotografija_url"
                      value={formData.fotografija_url}
                      onChange={handleInputChange}
                      placeholder="https://example.com/fotografija.jpg (neobavezno)"
                      disabled={!!selectedFile}
                    />
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        URL je onemogućen jer je odabrana datoteka za upload
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="text-memorial-gold" size={20} />
                      <h3 className="font-semibold text-foreground">Kontakt osobe</h3>
                    </div>
                    {contactPersons.length < 3 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addContactPerson}
                        className="border-memorial-gold text-memorial-gold hover:bg-memorial-gold hover:text-white"
                      >
                        <Plus size={16} className="mr-1" />
                        Dodaj
                      </Button>
                    )}
                  </div>
                  
                  {contactPersons.map((person, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg bg-background/50">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-foreground">
                          Kontakt osoba {index + 1} {index === 0 && "*"}
                        </Label>
                        {contactPersons.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContactPerson(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X size={16} />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`contact_ime_${index}`} className="text-sm">
                              Ime {index === 0 && "*"}
                            </Label>
                            <Input
                              id={`contact_ime_${index}`}
                              value={person.ime}
                              onChange={(e) => handleContactPersonChange(index, 'ime', e.target.value)}
                              required={index === 0}
                              placeholder="Ime kontakt osobe"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`contact_telefon_${index}`} className="text-sm">
                              Telefon
                            </Label>
                            <Input
                              id={`contact_telefon_${index}`}
                              value={person.telefon}
                              onChange={(e) => handleContactPersonChange(index, 'telefon', e.target.value)}
                              placeholder="Telefon (neobavezno)"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor={`contact_email_${index}`} className="text-sm">
                            Email {index === 0 && "*"}
                          </Label>
                          <Input
                            id={`contact_email_${index}`}
                            type="email"
                            value={person.email}
                            onChange={(e) => handleContactPersonChange(index, 'email', e.target.value)}
                            required={index === 0}
                            placeholder="Email kontakt osobe"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" required className="mt-1 h-4 w-4 accent-current" />
                  <span>Potvrđujem da imam pravo i ovlaštenje objaviti ovaj sadržaj te da poštujem <Link to="/pravila-objavljivanja" target="_blank" className="text-primary underline">Pravila objavljivanja</Link>. Obrada podataka opisana je u <Link to="/politika-privatnosti" target="_blank" className="text-primary underline">Politici privatnosti</Link>. *</span>
                </label>
                <Button 
                  type="submit" 
                  className="w-full bg-memorial-gold hover:bg-memorial-gold/90 text-white"
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Slanje zahtjeva...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2" size={20} />
                      Pošalji na odobrenje
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Osmrtnice sekcija */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Objavljene osmrtnice</h2>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  type="text"
                  placeholder="Pretražite po imenu ili prezimenu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {isLoadingObituaries ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-memorial-gold"></div>
            </div>
          ) : filteredObituaries.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                {searchTerm ? 'Nema rezultata za pretraživanje' : 'Nema objavljenih osmrtnica'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredObituaries.slice(0, visibleCount).map((obituary) => {
                const lifespan = formatLifespan(obituary.datum_rodenja, obituary.datum_smrti);
                const location = formatObituaryLocation(obituary.mjesto_rodenja, obituary.mjesto_smrti);
                const age = calculateObituaryAge(obituary.datum_rodenja, obituary.datum_smrti);

                return (
                <Link key={obituary.id} to={`/${obituary.slug}`}>
                  <Card className="memorial-card group hover:shadow-memorial transition-all duration-300 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        {/* Photo */}
                        <div className="relative mb-4">
                          <img 
                            src={obituary.fotografija_url || '/default-obituary-photo.jpg'}
                            alt={`${obituary.ime} ${obituary.prezime}`}
                            className="w-24 h-32 object-cover rounded-lg border-2 border-border mx-auto"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg" />
                        </div>

                        {/* Content */}
                        <div className="w-full">
                          <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                            {obituary.ime} {obituary.prezime}
                          </h3>
                          
                          {obituary.podnaslov && (
                            <p className="text-sm text-muted-foreground mb-2 italic">
                              {obituary.podnaslov}
                            </p>
                          )}
                          
                          <div className="space-y-1 text-sm text-muted-foreground mb-3">
                            {lifespan && (
                              <div className="flex items-center justify-center gap-2">
                                <span>{lifespan}</span>
                              </div>
                            )}
                            {location && (
                              <div className="flex items-center justify-center gap-2">
                                <MapPin size={14} />
                                <span>{location}</span>
                              </div>
                            )}
                            {obituary.groblje && (
                              <div className="flex items-center justify-center gap-2">
                                <span>Groblje: {obituary.groblje}</span>
                              </div>
                            )}
                          </div>

                          {age !== null && (
                            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full inline-block text-xs font-medium mb-3">
                              {ageLabel(age)}
                            </div>
                          )}

                          {obituary.biografija && (
                            <p className="text-sm text-foreground leading-relaxed mb-4">
                              {obituary.biografija.length > 80 
                                ? `${obituary.biografija.substring(0, 80)}...` 
                                : obituary.biografija}
                            </p>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Objavljeno: {formatDate(obituary.created_at)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                );
              })}
            </div>
          )}

          {!isLoadingObituaries && filteredObituaries.length > 0 && visibleCount < filteredObituaries.length && (
            <div className="text-center mt-8">
              <Button 
                variant="outline" 
                size="lg"
                className="border-memorial-gold text-memorial-gold hover:bg-memorial-gold hover:text-white px-8 py-3"
                onClick={() => setVisibleCount(prev => Math.min(prev + 6, filteredObituaries.length))}
              >
                Prikaži više
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ObjaviOsmrtnicu;
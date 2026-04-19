-- Treatment Engine tables
CREATE TABLE public.treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop TEXT NOT NULL,
  disease TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  immediate_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  chemical JSONB,
  organic JSONB,
  cultural JSONB NOT NULL DEFAULT '[]'::jsonb,
  prevention JSONB NOT NULL DEFAULT '[]'::jsonb,
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crop, disease, severity)
);

CREATE INDEX idx_treatments_crop_disease ON public.treatments (crop, disease);

CREATE TABLE public.crop_disease_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop TEXT NOT NULL,
  disease TEXT NOT NULL,
  probability NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (probability >= 0 AND probability <= 1),
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crop, disease)
);

CREATE INDEX idx_crop_disease_map_crop ON public.crop_disease_map (crop);

ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_disease_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Treatments are publicly readable"
  ON public.treatments FOR SELECT USING (true);

CREATE POLICY "Crop disease map is publicly readable"
  ON public.crop_disease_map FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER treatments_touch_updated_at
  BEFORE UPDATE ON public.treatments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed data: 10 crops, common diseases, 3 severities each (subset for MVP)
INSERT INTO public.treatments (crop, disease, severity, immediate_actions, chemical, organic, cultural, prevention, alerts, notes) VALUES
-- Tomato - Early Blight
('tomato','Early Blight','low',
 '["Remove a few affected lower leaves","Improve air circulation"]'::jsonb,
 '{"name":"Mancozeb 75% WP","dosage":"2 g / litre water","frequency":"Every 10 days, max 3 sprays","phi_days":7}'::jsonb,
 '{"name":"Neem oil 1500 ppm","dosage":"5 ml / litre water","frequency":"Every 7 days"}'::jsonb,
 '["Avoid overhead irrigation","Mulch around base"]'::jsonb,
 '["Use resistant varieties","Rotate with non-solanaceous crops"]'::jsonb,
 '["Do not spray within 6 hours of rain"]'::jsonb,
 'Catch early to prevent rapid spread in humid weather.'),
('tomato','Early Blight','medium',
 '["Spray fungicide within 24 hours","Remove all infected leaves and burn"]'::jsonb,
 '{"name":"Chlorothalonil 75% WP","dosage":"2.5 g / litre water","frequency":"Every 7 days, max 4 sprays","phi_days":7}'::jsonb,
 '{"name":"Bacillus subtilis bio-fungicide","dosage":"5 g / litre water","frequency":"Every 5-7 days"}'::jsonb,
 '["Stake plants for airflow","Remove lower leaves touching soil"]'::jsonb,
 '["Crop rotation 2-3 years","Avoid evening irrigation"]'::jsonb,
 '["Wear gloves and mask while spraying","Do not spray before rainfall"]'::jsonb,
 NULL),
('tomato','Early Blight','high',
 '["Spray immediately","Quarantine block from healthy plants","Destroy heavily infected plants"]'::jsonb,
 '{"name":"Azoxystrobin 23% SC","dosage":"1 ml / litre water","frequency":"Every 7 days, alternate with Mancozeb","phi_days":7}'::jsonb,
 '{"name":"Trichoderma + Neem combination","dosage":"10 g + 5 ml / litre","frequency":"Every 5 days"}'::jsonb,
 '["Burn infected debris","Disinfect tools between plants"]'::jsonb,
 '["Use certified disease-free seed","Solarize soil before next season"]'::jsonb,
 '["Overuse may cause fungicide resistance","Observe re-entry interval of 24h"]'::jsonb,
 'High pressure — consider expert consultation if >40% canopy affected.'),

-- Tomato - Late Blight
('tomato','Late Blight','medium',
 '["Spray within 12 hours","Remove infected fruits and leaves"]'::jsonb,
 '{"name":"Metalaxyl + Mancozeb 8% + 64% WP","dosage":"2.5 g / litre water","frequency":"Every 7 days","phi_days":10}'::jsonb,
 '{"name":"Copper oxychloride 50% WP","dosage":"3 g / litre water","frequency":"Every 7 days"}'::jsonb,
 '["Improve drainage","Avoid wetting foliage"]'::jsonb,
 '["Plant tolerant varieties","Avoid dense planting"]'::jsonb,
 '["Highly weather-driven — act fast in cool wet conditions"]'::jsonb,
 NULL),

-- Rice - Blast
('rice','Blast','medium',
 '["Drain field briefly","Spray within 24 hours"]'::jsonb,
 '{"name":"Tricyclazole 75% WP","dosage":"0.6 g / litre water","frequency":"Twice at 15 day interval","phi_days":21}'::jsonb,
 '{"name":"Pseudomonas fluorescens","dosage":"10 g / litre water","frequency":"Every 10 days"}'::jsonb,
 '["Balanced nitrogen — avoid excess urea","Maintain shallow water"]'::jsonb,
 '["Use resistant varieties","Treat seed before sowing"]'::jsonb,
 '["Do not over-fertilize with nitrogen"]'::jsonb,
 NULL),
('rice','Blast','high',
 '["Spray immediately","Reduce nitrogen top-dressing"]'::jsonb,
 '{"name":"Isoprothiolane 40% EC","dosage":"1.5 ml / litre water","frequency":"Twice at 10 day interval","phi_days":21}'::jsonb,
 '{"name":"Trichoderma viride","dosage":"10 g / litre water","frequency":"Every 7 days"}'::jsonb,
 '["Remove infected stubble","Adjust planting density"]'::jsonb,
 '["Crop rotation","Use silicon supplements"]'::jsonb,
 '["Severe blast can cause neck rot — monitor panicles"]'::jsonb,
 NULL),

-- Wheat - Rust
('wheat','Leaf Rust','medium',
 '["Spray within 48 hours","Scout neighbouring fields"]'::jsonb,
 '{"name":"Propiconazole 25% EC","dosage":"1 ml / litre water","frequency":"Once at first sign, repeat after 15 days","phi_days":35}'::jsonb,
 '{"name":"Sulphur 80% WP","dosage":"3 g / litre water","frequency":"Every 10 days"}'::jsonb,
 '["Avoid late sowing","Balanced potash application"]'::jsonb,
 '["Sow rust-resistant cultivars","Early sowing in northern plains"]'::jsonb,
 '["Do not spray in windy conditions"]'::jsonb,
 NULL),

-- Cotton - Bollworm
('cotton','Bollworm','medium',
 '["Install pheromone traps","Hand-pick visible larvae"]'::jsonb,
 '{"name":"Emamectin Benzoate 5% SG","dosage":"0.4 g / litre water","frequency":"Once, repeat after 10 days if needed","phi_days":7}'::jsonb,
 '{"name":"Bt (Bacillus thuringiensis)","dosage":"2 g / litre water","frequency":"Every 5-7 days in evening"}'::jsonb,
 '["Inter-crop with marigold","Encourage natural predators"]'::jsonb,
 '["Use Bt cotton hybrids","Refuge crops around field"]'::jsonb,
 '["Avoid pyrethroids early in season — causes resistance"]'::jsonb,
 NULL),

-- Potato - Late Blight
('potato','Late Blight','medium',
 '["Spray within 12 hours","Remove infected plants"]'::jsonb,
 '{"name":"Cymoxanil + Mancozeb 8% + 64% WP","dosage":"3 g / litre water","frequency":"Every 7 days","phi_days":10}'::jsonb,
 '{"name":"Copper hydroxide 53.8% DF","dosage":"2 g / litre water","frequency":"Every 7-10 days"}'::jsonb,
 '["Earth up plants","Improve drainage"]'::jsonb,
 '["Use certified seed tubers","Destroy volunteer plants"]'::jsonb,
 '["Critical in cool wet weather — spray prophylactically"]'::jsonb,
 NULL),

-- Chilli - Anthracnose
('chilli','Anthracnose','medium',
 '["Remove infected fruits","Spray within 24 hours"]'::jsonb,
 '{"name":"Carbendazim 50% WP","dosage":"1 g / litre water","frequency":"Every 10 days, max 3 sprays","phi_days":7}'::jsonb,
 '{"name":"Trichoderma harzianum","dosage":"5 g / litre water","frequency":"Weekly soil drench"}'::jsonb,
 '["Avoid overhead irrigation","Stake plants"]'::jsonb,
 '["Treat seeds with hot water (52°C, 30 min)","Crop rotation"]'::jsonb,
 '["Pick ripe fruits regularly to prevent spread"]'::jsonb,
 NULL),

-- Banana - Panama Wilt
('banana','Panama Wilt','high',
 '["Isolate infected mat","Do not move soil from infected area"]'::jsonb,
 '{"name":"Carbendazim soil drench","dosage":"2 g / litre water, 1 L per plant","frequency":"Once a month"}'::jsonb,
 '{"name":"Trichoderma viride enriched FYM","dosage":"50 g per plant","frequency":"At planting and every 3 months"}'::jsonb,
 '["Ensure proper drainage","Maintain soil pH 6-6.5"]'::jsonb,
 '["Use tissue-cultured disease-free suckers","Plant resistant cultivars (e.g., Yangambi KM-5)"]'::jsonb,
 '["Soil-borne and persistent — avoid replanting bananas in infected plots for 5+ years"]'::jsonb,
 'Panama wilt has no full chemical cure; cultural control is critical.'),

-- Grape - Powdery Mildew
('grape','Powdery Mildew','medium',
 '["Spray within 24 hours","Prune infected canes"]'::jsonb,
 '{"name":"Sulphur 80% WP","dosage":"2.5 g / litre water","frequency":"Every 10 days","phi_days":7}'::jsonb,
 '{"name":"Potassium bicarbonate","dosage":"5 g / litre water","frequency":"Every 7 days"}'::jsonb,
 '["Open canopy by pruning","Reduce nitrogen"]'::jsonb,
 '["Train vines for airflow","Resistant rootstocks"]'::jsonb,
 '["Avoid sulphur when temperature >32°C — risk of phytotoxicity"]'::jsonb,
 NULL),

-- Maize - Fall Armyworm
('maize','Fall Armyworm','medium',
 '["Hand-pick egg masses","Spray into whorl in evening"]'::jsonb,
 '{"name":"Spinetoram 11.7% SC","dosage":"0.5 ml / litre water","frequency":"Once, repeat after 10 days if needed","phi_days":7}'::jsonb,
 '{"name":"Neem seed kernel extract 5%","dosage":"50 ml / litre water","frequency":"Every 7 days"}'::jsonb,
 '["Place sand+lime in whorl as deterrent","Inter-crop with pulses"]'::jsonb,
 '["Pheromone traps at 5/acre","Early sowing","Bt maize hybrids where allowed"]'::jsonb,
 '["Spray in evening when larvae are active","Rotate insecticide groups"]'::jsonb,
 NULL),

-- Onion - Purple Blotch
('onion','Purple Blotch','medium',
 '["Spray within 24 hours","Remove worst affected leaves"]'::jsonb,
 '{"name":"Mancozeb 75% WP","dosage":"2.5 g / litre water","frequency":"Every 10 days, max 4 sprays","phi_days":7}'::jsonb,
 '{"name":"Neem oil + sticker","dosage":"5 ml / litre water","frequency":"Every 7 days"}'::jsonb,
 '["Avoid evening irrigation","Maintain plant spacing"]'::jsonb,
 '["Crop rotation 3 years","Use treated seed"]'::jsonb,
 '["Add a sticker — onion leaves are waxy"]'::jsonb,
 NULL);

-- Crop disease map (lightweight — used for symptom-based suggestions)
INSERT INTO public.crop_disease_map (crop, disease, probability, symptoms) VALUES
('tomato','Early Blight',0.85,ARRAY['brown spots','yellowing leaves','concentric rings']),
('tomato','Late Blight',0.80,ARRAY['water-soaked lesions','white mold underside','rapid spread']),
('rice','Blast',0.85,ARRAY['diamond-shaped lesions','grey centres','neck rot']),
('wheat','Leaf Rust',0.80,ARRAY['orange pustules','yellow halos','leaf drying']),
('cotton','Bollworm',0.85,ARRAY['holes in bolls','larvae visible','frass']),
('potato','Late Blight',0.85,ARRAY['dark blotches','white sporulation','tuber rot']),
('chilli','Anthracnose',0.80,ARRAY['sunken fruit lesions','black acervuli','fruit rot']),
('banana','Panama Wilt',0.85,ARRAY['yellowing lower leaves','split pseudostem','vascular browning']),
('grape','Powdery Mildew',0.80,ARRAY['white powder','distorted leaves','cracked berries']),
('maize','Fall Armyworm',0.85,ARRAY['ragged whorl feeding','frass','larvae in funnel']),
('onion','Purple Blotch',0.80,ARRAY['purple lesions','tip dieback','yellowing']);
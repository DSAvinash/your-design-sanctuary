CREATE TABLE public.plant_diseases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  temperature_min_c numeric NOT NULL,
  temperature_max_c numeric NOT NULL,
  humidity_min numeric NOT NULL,
  humidity_max numeric NOT NULL,
  dew_point_min_c numeric,
  dew_point_max_c numeric,
  wind_speed_max_kmh numeric,
  active_months integer[] NOT NULL DEFAULT '{}',
  description text NOT NULL,
  prevention text NOT NULL,
  wikipedia text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_diseases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plant diseases are publicly readable"
  ON public.plant_diseases FOR SELECT
  USING (true);

CREATE INDEX idx_plant_diseases_crop ON public.plant_diseases(crop);

INSERT INTO public.plant_diseases (crop,name,type,temperature_min_c,temperature_max_c,humidity_min,humidity_max,dew_point_min_c,dew_point_max_c,wind_speed_max_kmh,active_months,description,prevention,wikipedia) VALUES
('Apple','Apple Scab','Fungal',6,26,70,100,4,24,30,'{3,4,5,6}','Fungal infection causing olive-brown lesions on leaves and fruit.','Apply fungicide before rain events when temperatures are 6–26°C. Remove fallen leaves.','https://en.wikipedia.org/wiki/Apple_scab'),
('Apple','Fire Blight','Bacterial',18,30,65,100,10,24,40,'{4,5,6,7}','Bacterial disease causing wilted, blackened shoots that look scorched.','Prune infected branches 30cm below visible damage. Avoid high-nitrogen fertilizers in spring.','https://en.wikipedia.org/wiki/Fire_blight'),
('Apple','Powdery Mildew','Fungal',10,25,50,90,4,20,25,'{4,5,6,7,8}','White powdery growth on leaves and shoots reducing photosynthesis.','Apply sulfur or potassium bicarbonate sprays. Improve air circulation by pruning.','https://en.wikipedia.org/wiki/Powdery_mildew'),
('Apple','Cedar Apple Rust','Fungal',10,24,75,100,6,20,30,'{4,5,6}','Bright orange spots on leaves caused by fungus alternating with juniper hosts.','Remove nearby junipers when possible. Apply fungicide at pink bud stage.','https://en.wikipedia.org/wiki/Gymnosporangium_juniperi-virginianae'),
('Apricot','Brown Rot','Fungal',15,28,75,100,8,22,30,'{4,5,6,7,8}','Fungal rot causing brown lesions on fruit and blossom blight.','Remove mummified fruit. Apply fungicide at bloom and 3 weeks before harvest.','https://en.wikipedia.org/wiki/Monilinia_fructicola'),
('Apricot','Shot Hole Disease','Fungal',10,24,80,100,6,20,25,'{3,4,5,10,11}','Small purple spots that drop out leaving shot-hole appearance.','Apply copper fungicide in late autumn after leaf fall.','https://en.wikipedia.org/wiki/Wilsonomyces_carpophilus'),
('Apricot','Bacterial Canker','Bacterial',5,20,80,100,2,16,30,'{2,3,4,10,11}','Sunken cankers on branches with gummy ooze; kills shoots.','Prune in dry summer weather. Apply copper sprays in autumn.','https://en.wikipedia.org/wiki/Pseudomonas_syringae'),
('Cherry','Cherry Leaf Spot','Fungal',16,28,75,100,10,22,30,'{5,6,7,8}','Purple spots on leaves causing premature defoliation.','Apply fungicide after petal fall. Rake and destroy fallen leaves.','https://en.wikipedia.org/wiki/Blumeriella_jaapii'),
('Cherry','Brown Rot Blossom Blight','Fungal',15,25,80,100,8,22,30,'{4,5}','Blossoms turn brown and die; spreads to twigs and fruit.','Apply fungicide at popcorn and full bloom stages.','https://en.wikipedia.org/wiki/Monilinia_laxa'),
('Cherry','Powdery Mildew','Fungal',15,27,40,80,5,18,25,'{5,6,7,8}','White fungal growth on leaves and fruit.','Apply sulfur sprays. Avoid overhead irrigation.','https://en.wikipedia.org/wiki/Podosphaera_clandestina'),
('Grape','Downy Mildew','Fungal',13,25,80,100,8,22,25,'{5,6,7,8,9}','Yellow oil-spot lesions with white fuzzy growth on leaf undersides.','Apply copper-based fungicide. Improve canopy airflow.','https://en.wikipedia.org/wiki/Plasmopara_viticola'),
('Grape','Powdery Mildew','Fungal',20,27,40,70,8,18,20,'{5,6,7,8,9}','White powdery coating on leaves, shoots, and berries.','Apply sulfur every 10–14 days. Open canopy by leaf removal.','https://en.wikipedia.org/wiki/Erysiphe_necator'),
('Grape','Black Rot','Fungal',20,32,75,100,12,24,25,'{5,6,7,8}','Reddish-brown leaf spots; berries shrivel into hard black mummies.','Remove mummified berries. Apply fungicide from bud break to veraison.','https://en.wikipedia.org/wiki/Black_rot_(grape_disease)'),
('Grape','Botrytis Bunch Rot','Fungal',15,25,85,100,10,22,15,'{7,8,9,10}','Gray mold rotting ripening clusters in humid weather.','Open the canopy. Avoid wetting fruit. Apply botryticide before bunch closure.','https://en.wikipedia.org/wiki/Botrytis_cinerea'),
('Peach','Peach Leaf Curl','Fungal',8,16,80,100,4,12,30,'{2,3,4}','Reddish puckered, curled leaves in spring; severe defoliation.','Apply copper fungicide in late winter before bud swell.','https://en.wikipedia.org/wiki/Taphrina_deformans'),
('Peach','Brown Rot','Fungal',18,26,80,100,10,22,30,'{5,6,7,8}','Soft brown fruit rot with tan spore tufts; mummified fruit.','Thin fruit. Spray fungicide at bloom and pre-harvest.','https://en.wikipedia.org/wiki/Monilinia_fructicola'),
('Peach','Bacterial Spot','Bacterial',20,30,70,100,12,24,40,'{5,6,7,8}','Angular purple leaf spots; pitted fruit lesions.','Plant resistant varieties. Apply copper in dormant season.','https://en.wikipedia.org/wiki/Xanthomonas_arboricola'),
('Peach','Powdery Mildew','Fungal',18,28,40,80,8,20,25,'{5,6,7}','White fungal coating on shoots and immature fruit.','Apply sulfur. Avoid wetting foliage.','https://en.wikipedia.org/wiki/Podosphaera_pannosa'),
('Pear','Fire Blight','Bacterial',18,30,65,100,10,24,40,'{4,5,6,7}','Shoots wilt and turn black as if scorched; oozing cankers.','Prune infected wood 30cm below visible damage. Apply streptomycin or copper at bloom.','https://en.wikipedia.org/wiki/Fire_blight'),
('Pear','Pear Scab','Fungal',6,24,75,100,4,20,30,'{3,4,5,6}','Olive-brown velvety spots on leaves and fruit.','Apply fungicide at green tip and petal fall. Remove fallen leaves.','https://en.wikipedia.org/wiki/Venturia_pirina'),
('Pear','Pear Rust','Fungal',10,24,75,100,6,20,30,'{4,5,6,7}','Bright orange spots on leaves; alternates with juniper.','Remove nearby junipers. Apply fungicide at pink bud.','https://en.wikipedia.org/wiki/Gymnosporangium_sabinae'),
('Tomato','Early Blight','Fungal',24,29,80,100,16,24,25,'{5,6,7,8,9}','Concentric brown rings on lower leaves; defoliation upward.','Mulch to prevent soil splash. Apply chlorothalonil or copper.','https://en.wikipedia.org/wiki/Alternaria_solani'),
('Tomato','Late Blight','Fungal',10,24,90,100,8,20,20,'{6,7,8,9}','Greasy gray-green leaf lesions; rapid plant collapse in cool wet weather.','Apply preventive fungicide. Remove volunteer potato plants.','https://en.wikipedia.org/wiki/Phytophthora_infestans'),
('Tomato','Septoria Leaf Spot','Fungal',15,27,80,100,10,22,25,'{6,7,8,9}','Tiny dark spots with gray centers on lower leaves.','Stake plants for airflow. Apply copper or chlorothalonil weekly.','https://en.wikipedia.org/wiki/Septoria_lycopersici'),
('Tomato','Bacterial Spot','Bacterial',24,30,70,100,16,24,40,'{6,7,8}','Small water-soaked leaf spots that turn brown; scabby fruit lesions.','Use disease-free seed. Apply copper sprays at first sign.','https://en.wikipedia.org/wiki/Xanthomonas_perforans'),
('Tomato','Powdery Mildew','Fungal',20,28,50,80,10,20,20,'{6,7,8,9}','White powdery patches on leaves; yellowing and drop.','Apply potassium bicarbonate or sulfur. Improve airflow.','https://en.wikipedia.org/wiki/Leveillula_taurica'),
('Potato','Late Blight','Fungal',10,24,90,100,8,20,20,'{6,7,8,9}','Dark water-soaked lesions on leaves; tubers rot in storage.','Plant certified seed. Apply preventive fungicide before rain.','https://en.wikipedia.org/wiki/Phytophthora_infestans'),
('Potato','Early Blight','Fungal',24,29,80,100,16,24,25,'{6,7,8}','Target-spot lesions on older leaves; tuber lesions.','Rotate crops. Apply chlorothalonil at row closure.','https://en.wikipedia.org/wiki/Alternaria_solani'),
('Potato','Black Scurf','Fungal',15,25,70,100,8,20,30,'{5,6,7,8,9}','Black sclerotia on tubers; stem cankers reducing emergence.','Use clean seed. Avoid early planting in cold wet soil.','https://en.wikipedia.org/wiki/Rhizoctonia_solani'),
('Potato','Common Scab','Bacterial',20,30,40,70,10,20,40,'{6,7,8}','Rough corky lesions on tuber surface in dry alkaline soil.','Maintain soil moisture during tuber set. Avoid liming.','https://en.wikipedia.org/wiki/Streptomyces_scabies'),
('Corn','Northern Corn Leaf Blight','Fungal',18,27,80,100,12,22,25,'{6,7,8,9}','Long cigar-shaped gray-green lesions on leaves.','Plant resistant hybrids. Apply foliar fungicide at tasseling.','https://en.wikipedia.org/wiki/Setosphaeria_turcica'),
('Corn','Southern Rust','Fungal',24,28,80,100,16,22,30,'{7,8,9}','Orange pustules on upper leaf surfaces; rapid spread in heat.','Apply fungicide at first sign. Plant earlier-maturing varieties.','https://en.wikipedia.org/wiki/Puccinia_polysora'),
('Corn','Common Rust','Fungal',15,25,80,100,10,22,30,'{6,7,8,9}','Cinnamon-brown pustules on both leaf surfaces.','Plant resistant hybrids. Fungicide rarely needed.','https://en.wikipedia.org/wiki/Puccinia_sorghi'),
('Corn','Gray Leaf Spot','Fungal',22,30,90,100,16,24,20,'{7,8,9}','Rectangular gray lesions bounded by leaf veins.','Rotate crops. Till residue. Apply fungicide at tasseling.','https://en.wikipedia.org/wiki/Cercospora_zeae-maydis'),
('Corn','Goss''s Wilt','Bacterial',25,32,70,100,16,24,50,'{6,7,8}','Water-soaked leaf streaks with shiny bacterial ooze.','Plant resistant hybrids. Rotate away from corn for one season.','https://en.wikipedia.org/wiki/Clavibacter_nebraskensis');
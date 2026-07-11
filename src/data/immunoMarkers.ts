export interface ImmunoMarkerInfo {
  name: string;
  fullName: string;
  function: string;
  purpose: string;
  samples: string[];
  panel?: string;
}

export interface DetectionKitInfo {
  name: string;
  fullName: string;
  function: string;
  purpose: string;
  samples: string[];
}

// A comprehensive list of IHC markers used in diagnostic pathology
export const IMMUNO_MARKERS: ImmunoMarkerInfo[] = [
  // Epithelial Markers
  { name: 'CK7', fullName: 'Cytokeratin 7', function: 'Intermediate filament protein in simple epithelia', purpose: 'Differentiates adenocarcinomas by site of origin', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'CK Panel' },
  { name: 'CK20', fullName: 'Cytokeratin 20', function: 'Intermediate filament in GI and urothelial epithelium', purpose: 'Identifies colorectal, urothelial, and Merkel cell carcinomas', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'CK Panel' },
  { name: 'CK5/6', fullName: 'Cytokeratin 5/6', function: 'High molecular weight cytokeratin in stratified epithelia', purpose: 'Identifies squamous cell carcinoma and mesothelioma', samples: ['Biopsy', 'Excision'], panel: 'CK Panel' },
  { name: 'CK14', fullName: 'Cytokeratin 14', function: 'Basal cell cytokeratin', purpose: 'Identifies basal/myoepithelial cells', samples: ['Biopsy', 'Excision'], panel: 'CK Panel' },
  { name: 'CK19', fullName: 'Cytokeratin 19', function: 'Simple epithelial cytokeratin', purpose: 'Differentiates thyroid carcinoma from benign lesions', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'CK Panel' },
  { name: 'AE1/AE3', fullName: 'Pan-Cytokeratin AE1/AE3', function: 'Broad spectrum cytokeratin cocktail', purpose: 'Confirms epithelial differentiation', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'CAM5.2', fullName: 'Cytokeratin CAM5.2', function: 'Low molecular weight cytokeratin', purpose: 'Identifies carcinomas, especially hepatocellular', samples: ['Biopsy', 'Excision'] },
  { name: 'CK8/18', fullName: 'Cytokeratin 8/18', function: 'Simple epithelial cytokeratins', purpose: 'Marks simple glandular epithelia', samples: ['Biopsy', 'Excision'] },
  { name: 'EMA', fullName: 'Epithelial Membrane Antigen (MUC1)', function: 'Transmembrane glycoprotein on epithelial surfaces', purpose: 'Confirms epithelial origin; marks meningiomas, plasma cells', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'BerEP4', fullName: 'BerEP4 (EpCAM)', function: 'Epithelial cell adhesion molecule', purpose: 'Differentiates BCC from SCC; separates mesothelioma from adenocarcinoma', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'E-Cadherin', fullName: 'E-Cadherin', function: 'Calcium-dependent cell adhesion protein', purpose: 'Differentiates lobular from ductal breast carcinoma', samples: ['Biopsy', 'Excision'] },
  { name: 'P-Cadherin', fullName: 'P-Cadherin', function: 'Placental cadherin cell adhesion', purpose: 'Marks basal-like breast carcinoma', samples: ['Biopsy', 'Excision'] },
  { name: 'MOC-31', fullName: 'MOC-31 (EpCAM)', function: 'Epithelial glycoprotein', purpose: 'Differentiates adenocarcinoma from mesothelioma', samples: ['Biopsy', 'Cell Block'] },
  
  // Breast Panel
  { name: 'ER', fullName: 'Estrogen Receptor', function: 'Nuclear hormone receptor for estrogen', purpose: 'Predicts response to hormonal therapy in breast cancer', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Breast Panel' },
  { name: 'PR', fullName: 'Progesterone Receptor', function: 'Nuclear hormone receptor for progesterone', purpose: 'Predicts response to hormonal therapy in breast cancer', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Breast Panel' },
  { name: 'HER2', fullName: 'Human Epidermal Growth Factor Receptor 2', function: 'Tyrosine kinase receptor promoting cell growth', purpose: 'Determines eligibility for targeted therapy (Trastuzumab)', samples: ['Biopsy', 'Excision'], panel: 'Breast Panel' },
  { name: 'Ki-67', fullName: 'Ki-67 (MIB-1)', function: 'Nuclear protein associated with cell proliferation', purpose: 'Assesses tumor proliferation rate and grading', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Breast Panel' },
  { name: 'GATA3', fullName: 'GATA Binding Protein 3', function: 'Transcription factor in T-cell and breast development', purpose: 'Identifies breast and urothelial carcinomas', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Breast Panel' },
  { name: 'GCDFP-15', fullName: 'Gross Cystic Disease Fluid Protein 15', function: 'Apocrine differentiation marker', purpose: 'Confirms breast origin in metastatic carcinoma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Breast Panel' },
  { name: 'Mammaglobin', fullName: 'Mammaglobin', function: 'Secretory protein of breast epithelium', purpose: 'Identifies breast carcinoma metastasis', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Breast Panel' },

  // Lymphoma Panel
  { name: 'CD3', fullName: 'CD3 (T-cell co-receptor)', function: 'Part of TCR signaling complex on T-cells', purpose: 'Identifies T-cell lineage in lymphomas', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'CD4', fullName: 'CD4 (Helper T-cell marker)', function: 'Co-receptor for MHC class II', purpose: 'Identifies helper T-cells; mycosis fungoides', samples: ['Biopsy', 'Excision'], panel: 'Lymphoma Panel' },
  { name: 'CD5', fullName: 'CD5', function: 'T-cell surface glycoprotein', purpose: 'T-cell marker; co-expressed in CLL/SLL and MCL', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'CD7', fullName: 'CD7', function: 'T-cell and NK-cell antigen', purpose: 'T-cell lymphoma marker; loss suggests T-cell neoplasm', samples: ['Biopsy', 'Excision'], panel: 'Lymphoma Panel' },
  { name: 'CD8', fullName: 'CD8 (Cytotoxic T-cell marker)', function: 'Co-receptor for MHC class I', purpose: 'Identifies cytotoxic T-cells', samples: ['Biopsy', 'Excision'], panel: 'Lymphoma Panel' },
  { name: 'CD10', fullName: 'CD10 (CALLA/Neprilysin)', function: 'Zinc metalloprotease on cell surface', purpose: 'Marks follicular lymphoma, Burkitt lymphoma, ALL', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'CD15', fullName: 'CD15 (Leu-M1)', function: 'Carbohydrate adhesion molecule', purpose: 'Identifies Reed-Sternberg cells in Hodgkin lymphoma', samples: ['Biopsy', 'Excision'], panel: 'Lymphoma Panel' },
  { name: 'CD20', fullName: 'CD20', function: 'B-cell surface molecule regulating calcium transport', purpose: 'Identifies B-cell lymphomas; Rituximab target', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'CD21', fullName: 'CD21 (CR2)', function: 'Complement receptor on follicular dendritic cells', purpose: 'Highlights follicular dendritic cell networks', samples: ['Biopsy', 'Excision'], panel: 'Lymphoma Panel' },
  { name: 'CD23', fullName: 'CD23 (Fc epsilon RII)', function: 'Low-affinity IgE receptor', purpose: 'Marks CLL/SLL; differentiates from MCL', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'CD30', fullName: 'CD30 (Ki-1)', function: 'TNF receptor superfamily member', purpose: 'Identifies ALCL and Hodgkin lymphoma RS cells', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'CD34', fullName: 'CD34', function: 'Transmembrane glycoprotein on stem cells/endothelium', purpose: 'Marks vascular tumors, DFSP, GIST; stem cell marker', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'CD38', fullName: 'CD38', function: 'Cyclic ADP ribose hydrolase', purpose: 'Plasma cell marker; prognostic in CLL', samples: ['Biopsy', 'Excision'], panel: 'Lymphoma Panel' },
  { name: 'CD43', fullName: 'CD43 (Leukosialin)', function: 'Sialomucin on leukocytes', purpose: 'Aberrant B-cell expression in lymphomas', samples: ['Biopsy', 'Excision'], panel: 'Lymphoma Panel' },
  { name: 'CD45', fullName: 'CD45 (LCA)', function: 'Leukocyte common antigen tyrosine phosphatase', purpose: 'Confirms lymphoid/hematopoietic origin', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'CD56', fullName: 'CD56 (NCAM)', function: 'Neural cell adhesion molecule', purpose: 'NK/T-cell lymphomas, neuroendocrine tumors, myeloma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'CD68', fullName: 'CD68 (KP1/PGM1)', function: 'Lysosomal glycoprotein in monocytes/macrophages', purpose: 'Identifies histiocytic and monocytic lineage', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'CD79a', fullName: 'CD79a', function: 'Ig-associated alpha chain in B-cell receptor complex', purpose: 'B-cell marker; positive in some acute leukemias', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'CD99', fullName: 'CD99 (MIC2)', function: 'Transmembrane glycoprotein', purpose: 'Identifies Ewing sarcoma, lymphoblastic lymphoma', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'CD117', fullName: 'CD117 (c-KIT)', function: 'Tyrosine kinase receptor for SCF', purpose: 'Identifies GIST, mastocytosis, seminoma, AML', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'CD138', fullName: 'CD138 (Syndecan-1)', function: 'Transmembrane heparan sulfate proteoglycan', purpose: 'Plasma cell marker; myeloma diagnosis', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'PAX5', fullName: 'Paired Box Protein 5', function: 'B-cell transcription factor', purpose: 'Identifies B-cell lymphomas and Hodgkin lymphoma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'BCL2', fullName: 'B-Cell Lymphoma 2', function: 'Anti-apoptotic protein', purpose: 'Identifies follicular lymphoma; prognostic marker', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'BCL6', fullName: 'B-Cell Lymphoma 6', function: 'Transcriptional repressor in germinal center B-cells', purpose: 'Marks germinal center origin lymphomas', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'MUM1', fullName: 'Multiple Myeloma Oncogene 1 (IRF4)', function: 'Interferon regulatory factor', purpose: 'Post-germinal center B-cell marker; subclassifies DLBCL', samples: ['Biopsy', 'Excision'], panel: 'Lymphoma Panel' },
  { name: 'Cyclin D1', fullName: 'Cyclin D1 (BCL1)', function: 'Cell cycle regulatory protein', purpose: 'Diagnostic for mantle cell lymphoma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'TdT', fullName: 'Terminal Deoxynucleotidyl Transferase', function: 'DNA polymerase in immature lymphoid cells', purpose: 'Identifies lymphoblastic lymphoma/leukemia', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Lymphoma Panel' },
  { name: 'ALK', fullName: 'Anaplastic Lymphoma Kinase', function: 'Receptor tyrosine kinase', purpose: 'Identifies ALK+ ALCL and ALK+ lung adenocarcinoma', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'Kappa', fullName: 'Immunoglobulin Kappa Light Chain', function: 'Light chain of immunoglobulin', purpose: 'Demonstrates clonality in B-cell lymphomas', samples: ['Biopsy', 'Excision'], panel: 'Light Chain Panel' },
  { name: 'Lambda', fullName: 'Immunoglobulin Lambda Light Chain', function: 'Light chain of immunoglobulin', purpose: 'Demonstrates clonality in B-cell lymphomas', samples: ['Biopsy', 'Excision'], panel: 'Light Chain Panel' },

  // Melanoma Panel
  { name: 'S100', fullName: 'S100 Protein', function: 'Calcium-binding protein in neural crest-derived cells', purpose: 'Sensitive marker for melanoma and nerve sheath tumors', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Melanoma Panel' },
  { name: 'HMB45', fullName: 'Human Melanoma Black 45 (gp100)', function: 'Melanosomal glycoprotein', purpose: 'Specific melanoma marker; PEComas', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Melanoma Panel' },
  { name: 'Melan-A', fullName: 'Melan-A (MART-1)', function: 'Melanocyte differentiation antigen', purpose: 'Identifies melanocytic lesions', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Melanoma Panel' },
  { name: 'SOX10', fullName: 'SRY-Box Transcription Factor 10', function: 'Transcription factor in neural crest development', purpose: 'Melanoma, schwannoma, myoepithelial tumors', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Melanoma Panel' },
  { name: 'Tyrosinase', fullName: 'Tyrosinase', function: 'Enzyme in melanin biosynthesis', purpose: 'Highly specific melanoma marker', samples: ['Biopsy', 'Excision'], panel: 'Melanoma Panel' },
  { name: 'MITF', fullName: 'Microphthalmia-associated Transcription Factor', function: 'Transcription factor for melanocyte survival', purpose: 'Identifies melanocytic tumors', samples: ['Biopsy', 'Excision'], panel: 'Melanoma Panel' },

  // Mesenchymal / Soft Tissue
  { name: 'Vimentin', fullName: 'Vimentin', function: 'Intermediate filament in mesenchymal cells', purpose: 'Confirms mesenchymal origin; internal positive control', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'SMA', fullName: 'Smooth Muscle Actin', function: 'Actin isoform in smooth muscle and myofibroblasts', purpose: 'Identifies smooth muscle tumors, myofibroblastic lesions', samples: ['Biopsy', 'Excision'] },
  { name: 'Desmin', fullName: 'Desmin', function: 'Intermediate filament in muscle cells', purpose: 'Identifies rhabdomyosarcoma, leiomyosarcoma', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'Myogenin', fullName: 'Myogenin', function: 'Muscle-specific transcription factor', purpose: 'Highly specific for rhabdomyosarcoma', samples: ['Biopsy', 'Excision'] },
  { name: 'MyoD1', fullName: 'Myogenic Differentiation 1', function: 'Myogenic regulatory transcription factor', purpose: 'Identifies rhabdomyosarcoma', samples: ['Biopsy', 'Excision'] },
  { name: 'DOG1', fullName: 'Discovered on GIST-1 (ANO1)', function: 'Calcium-activated chloride channel', purpose: 'Highly sensitive and specific for GIST', samples: ['Biopsy', 'Excision'] },
  { name: 'STAT6', fullName: 'Signal Transducer and Activator of Transcription 6', function: 'Transcription factor', purpose: 'Diagnostic for solitary fibrous tumor', samples: ['Biopsy', 'Excision'] },
  { name: 'ERG', fullName: 'ETS-Related Gene', function: 'ETS family transcription factor', purpose: 'Vascular endothelial marker; prostate cancer marker', samples: ['Biopsy', 'Excision'] },
  { name: 'FLI1', fullName: 'Friend Leukemia Integration 1', function: 'ETS transcription factor', purpose: 'Vascular tumors and Ewing sarcoma', samples: ['Biopsy', 'Excision'] },
  { name: 'Factor VIII', fullName: 'Factor VIII Related Antigen (vWF)', function: 'Von Willebrand factor in endothelium', purpose: 'Identifies vascular tumors', samples: ['Biopsy', 'Excision'] },
  { name: 'CD31', fullName: 'CD31 (PECAM-1)', function: 'Platelet endothelial cell adhesion molecule', purpose: 'Most sensitive endothelial marker', samples: ['Biopsy', 'Excision'] },
  { name: 'Podoplanin', fullName: 'Podoplanin (D2-40)', function: 'Mucin-type transmembrane glycoprotein', purpose: 'Lymphatic endothelial marker; seminoma, mesothelioma', samples: ['Biopsy', 'Excision'] },
  { name: 'MDM2', fullName: 'Mouse Double Minute 2', function: 'E3 ubiquitin ligase; p53 negative regulator', purpose: 'Differentiates well-differentiated liposarcoma from lipoma', samples: ['Biopsy', 'Excision'] },
  { name: 'CDK4', fullName: 'Cyclin-Dependent Kinase 4', function: 'Cell cycle regulatory kinase', purpose: 'Co-marker with MDM2 for liposarcoma', samples: ['Biopsy', 'Excision'] },
  { name: 'TLE1', fullName: 'Transducin-Like Enhancer of Split 1', function: 'Transcriptional corepressor', purpose: 'Identifies synovial sarcoma', samples: ['Biopsy', 'Excision'] },
  { name: 'INI1', fullName: 'INI1 (SMARCB1/BAF47)', function: 'SWI/SNF chromatin remodeling complex member', purpose: 'Loss identifies rhabdoid tumors, epithelioid sarcoma', samples: ['Biopsy', 'Excision'] },
  { name: 'H3K27me3', fullName: 'Trimethylated Histone H3 Lysine 27', function: 'Epigenetic histone modification', purpose: 'Loss in MPNST and some PRC2-deficient tumors', samples: ['Biopsy', 'Excision'] },

  // Neuroendocrine Panel
  { name: 'Chromogranin A', fullName: 'Chromogranin A', function: 'Secretory granule protein in neuroendocrine cells', purpose: 'Identifies neuroendocrine tumors', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Neuroendocrine Panel' },
  { name: 'Synaptophysin', fullName: 'Synaptophysin', function: 'Synaptic vesicle glycoprotein', purpose: 'Broad neuroendocrine marker', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Neuroendocrine Panel' },
  { name: 'NSE', fullName: 'Neuron-Specific Enolase', function: 'Glycolytic enzyme in neurons/neuroendocrine cells', purpose: 'Non-specific neuroendocrine marker', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Neuroendocrine Panel' },
  { name: 'INSM1', fullName: 'Insulinoma-Associated Protein 1', function: 'Zinc finger transcription factor', purpose: 'Highly sensitive/specific neuroendocrine marker', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Neuroendocrine Panel' },

  // Germ Cell Tumors
  { name: 'OCT4', fullName: 'Octamer-Binding Transcription Factor 4', function: 'Pluripotency transcription factor', purpose: 'Identifies seminoma and embryonal carcinoma', samples: ['Biopsy', 'Excision'], panel: 'Germ Cell Panel' },
  { name: 'PLAP', fullName: 'Placental Alkaline Phosphatase', function: 'Alkaline phosphatase isoenzyme', purpose: 'Identifies seminoma and other germ cell tumors', samples: ['Biopsy', 'Excision'], panel: 'Germ Cell Panel' },
  { name: 'AFP', fullName: 'Alpha-Fetoprotein', function: 'Fetal serum protein', purpose: 'Identifies yolk sac tumors and hepatocellular carcinoma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Germ Cell Panel' },
  { name: 'hCG', fullName: 'Human Chorionic Gonadotropin', function: 'Hormone produced by syncytiotrophoblasts', purpose: 'Identifies choriocarcinoma', samples: ['Biopsy', 'Excision'], panel: 'Germ Cell Panel' },
  { name: 'SALL4', fullName: 'Sal-Like Protein 4', function: 'Zinc finger transcription factor', purpose: 'Broad germ cell tumor marker', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Germ Cell Panel' },
  { name: 'Glypican-3', fullName: 'Glypican-3', function: 'Heparan sulfate proteoglycan', purpose: 'Identifies hepatocellular carcinoma and yolk sac tumors', samples: ['Biopsy', 'Excision', 'Cell Block'] },

  // Prostate
  { name: 'PSA', fullName: 'Prostate-Specific Antigen', function: 'Serine protease in prostatic secretions', purpose: 'Identifies prostate carcinoma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Prostate Panel' },
  { name: 'PSAP', fullName: 'Prostatic Acid Phosphatase', function: 'Acid phosphatase enzyme in prostate', purpose: 'Confirms prostatic origin', samples: ['Biopsy', 'Excision'], panel: 'Prostate Panel' },
  { name: 'NKX3.1', fullName: 'NK3 Homeobox 1', function: 'Prostate-specific transcription factor', purpose: 'Highly specific prostate carcinoma marker', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Prostate Panel' },
  { name: 'AMACR', fullName: 'Alpha-Methylacyl-CoA Racemase (P504S)', function: 'Peroxisomal enzyme in fatty acid metabolism', purpose: 'Identifies prostate carcinoma; also in renal cell carcinoma', samples: ['Biopsy', 'Excision'], panel: 'Prostate Panel' },
  { name: 'p63', fullName: 'Tumor Protein p63', function: 'p53 family transcription factor', purpose: 'Basal cell marker; squamous cell marker; absent in prostate Ca', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Prostate Panel' },
  { name: 'HMWCK', fullName: 'High Molecular Weight Cytokeratin (34βE12)', function: 'Cytokeratins 1, 5, 10, 14', purpose: 'Identifies basal cells; absent in prostate adenocarcinoma', samples: ['Biopsy', 'Excision'], panel: 'Prostate Panel' },

  // Thyroid
  { name: 'TTF1', fullName: 'Thyroid Transcription Factor 1 (NKX2-1)', function: 'Homeodomain transcription factor in thyroid and lung', purpose: 'Identifies thyroid and lung adenocarcinomas', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Thyroid/Lung Panel' },
  { name: 'Thyroglobulin', fullName: 'Thyroglobulin', function: 'Precursor protein for thyroid hormones', purpose: 'Identifies differentiated thyroid carcinoma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Thyroid/Lung Panel' },
  { name: 'PAX8', fullName: 'Paired Box Gene 8', function: 'Transcription factor in thyroid, kidney, Müllerian tract', purpose: 'Marks thyroid, renal, and ovarian carcinomas', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'Calcitonin', fullName: 'Calcitonin', function: 'Peptide hormone from parafollicular C-cells', purpose: 'Identifies medullary thyroid carcinoma', samples: ['Biopsy', 'Excision', 'Cell Block'] },

  // Lung
  { name: 'Napsin A', fullName: 'Napsin A', function: 'Aspartic proteinase in type II pneumocytes', purpose: 'Identifies lung adenocarcinoma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Thyroid/Lung Panel' },
  { name: 'p40', fullName: 'p40 (ΔNp63)', function: 'Truncated isoform of p63', purpose: 'Highly specific squamous marker in lung', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'PD-L1', fullName: 'Programmed Death-Ligand 1', function: 'Immune checkpoint ligand', purpose: 'Predicts response to immunotherapy in lung cancer', samples: ['Biopsy', 'Excision'] },

  // GI / Liver
  { name: 'CDX2', fullName: 'Caudal-Type Homeobox 2', function: 'Intestinal transcription factor', purpose: 'Identifies GI tract adenocarcinomas', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'GI Panel' },
  { name: 'HepPar1', fullName: 'Hepatocyte Paraffin 1', function: 'Mitochondrial antigen in hepatocytes', purpose: 'Identifies hepatocellular carcinoma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Liver Panel' },
  { name: 'Arginase-1', fullName: 'Arginase-1', function: 'Urea cycle enzyme in hepatocytes', purpose: 'Most sensitive and specific hepatocyte marker', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Liver Panel' },
  { name: 'CEA', fullName: 'Carcinoembryonic Antigen', function: 'Glycoprotein involved in cell adhesion', purpose: 'Identifies GI tract adenocarcinoma; canalicular pattern in HCC', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'CA19-9', fullName: 'Carbohydrate Antigen 19-9', function: 'Sialylated Lewis antigen', purpose: 'Pancreatic and biliary tract carcinomas', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'MUC2', fullName: 'Mucin 2', function: 'Gel-forming mucin in intestinal goblet cells', purpose: 'Identifies mucinous differentiation', samples: ['Biopsy', 'Excision'] },
  { name: 'MUC5AC', fullName: 'Mucin 5AC', function: 'Gastric foveolar mucin', purpose: 'Identifies gastric-type mucin production', samples: ['Biopsy', 'Excision'] },
  { name: 'MUC6', fullName: 'Mucin 6', function: 'Pyloric gland mucin', purpose: 'Identifies pyloric gland differentiation', samples: ['Biopsy', 'Excision'] },

  // Gynecological
  { name: 'WT1', fullName: 'Wilms Tumor 1', function: 'Zinc finger transcription factor', purpose: 'Marks serous ovarian carcinoma and mesothelioma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Gynecological Panel' },
  { name: 'CA125', fullName: 'Cancer Antigen 125 (MUC16)', function: 'Transmembrane mucin', purpose: 'Marks ovarian serous carcinoma; peritoneal mesothelioma', samples: ['Biopsy', 'Excision', 'Cell Block'], panel: 'Gynecological Panel' },
  { name: 'p16', fullName: 'p16 (CDKN2A)', function: 'Cyclin-dependent kinase inhibitor', purpose: 'HPV-related cervical/oropharyngeal carcinomas; mesothelioma', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'Inhibin', fullName: 'Inhibin Alpha', function: 'TGF-beta superfamily member', purpose: 'Identifies sex cord-stromal tumors, adrenal cortical tumors', samples: ['Biopsy', 'Excision'] },
  { name: 'Calretinin', fullName: 'Calretinin', function: 'Calcium-binding protein', purpose: 'Marks mesothelioma and sex cord-stromal tumors', samples: ['Biopsy', 'Excision', 'Cell Block'] },

  // Renal
  { name: 'CA-IX', fullName: 'Carbonic Anhydrase IX', function: 'Transmembrane zinc metalloenzyme', purpose: 'Identifies clear cell renal cell carcinoma', samples: ['Biopsy', 'Excision'], panel: 'Renal Panel' },
  { name: 'RCC', fullName: 'Renal Cell Carcinoma Marker (gp200)', function: 'Glycoprotein on renal proximal tubules', purpose: 'Identifies renal cell carcinoma', samples: ['Biopsy', 'Excision'], panel: 'Renal Panel' },

  // CNS
  { name: 'GFAP', fullName: 'Glial Fibrillary Acidic Protein', function: 'Intermediate filament in astrocytes', purpose: 'Identifies glial tumors', samples: ['Biopsy', 'Excision'], panel: 'CNS Panel' },
  { name: 'Olig2', fullName: 'Oligodendrocyte Transcription Factor 2', function: 'bHLH transcription factor', purpose: 'Marks oligodendrogliomas and diffuse gliomas', samples: ['Biopsy', 'Excision'], panel: 'CNS Panel' },
  { name: 'NeuN', fullName: 'Neuronal Nuclear Protein (RBFOX3)', function: 'RNA-binding protein in mature neurons', purpose: 'Identifies mature neuronal cells', samples: ['Biopsy', 'Excision'], panel: 'CNS Panel' },
  { name: 'Neurofilament', fullName: 'Neurofilament', function: 'Intermediate filament in neurons', purpose: 'Identifies neuronal differentiation', samples: ['Biopsy', 'Excision'], panel: 'CNS Panel' },
  { name: 'IDH1 R132H', fullName: 'Isocitrate Dehydrogenase 1 R132H', function: 'Mutant metabolic enzyme', purpose: 'Identifies IDH-mutant diffuse gliomas', samples: ['Biopsy', 'Excision'], panel: 'CNS Panel' },
  { name: 'ATRX', fullName: 'Alpha Thalassemia/Mental Retardation X-linked', function: 'Chromatin remodeling protein', purpose: 'Loss identifies astrocytoma (IDH-mutant)', samples: ['Biopsy', 'Excision'], panel: 'CNS Panel' },
  { name: 'H3K27M', fullName: 'Histone H3 K27M Mutant', function: 'Mutant histone protein', purpose: 'Identifies diffuse midline glioma', samples: ['Biopsy', 'Excision'], panel: 'CNS Panel' },

  // Miscellaneous
  { name: 'P53', fullName: 'Tumor Protein p53', function: 'Tumor suppressor transcription factor', purpose: 'Mutant pattern indicates TP53 mutation', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'Beta-Catenin', fullName: 'Beta-Catenin', function: 'Cell adhesion and Wnt signaling molecule', purpose: 'Nuclear staining in desmoid tumors; hepatoblastoma', samples: ['Biopsy', 'Excision'] },
  { name: 'Claudin-4', fullName: 'Claudin-4', function: 'Tight junction protein', purpose: 'Differentiates adenocarcinoma from mesothelioma', samples: ['Biopsy', 'Cell Block'] },
  { name: 'D2-40', fullName: 'Podoplanin (D2-40)', function: 'Lymphatic endothelial glycoprotein', purpose: 'Identifies lymphatic invasion and mesothelioma', samples: ['Biopsy', 'Excision'] },
  { name: 'IgG4', fullName: 'Immunoglobulin G4', function: 'IgG subclass', purpose: 'Identifies IgG4-related disease', samples: ['Biopsy', 'Excision'] },
  { name: 'IgG', fullName: 'Immunoglobulin G', function: 'Major serum immunoglobulin', purpose: 'IgG4/IgG ratio in IgG4-related disease', samples: ['Biopsy', 'Excision'] },
  { name: 'Myeloperoxidase', fullName: 'Myeloperoxidase (MPO)', function: 'Enzyme in azurophilic granules of myeloid cells', purpose: 'Identifies myeloid sarcoma (granulocytic sarcoma)', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'Lysozyme', fullName: 'Lysozyme (Muramidase)', function: 'Enzyme in monocytes and granulocytes', purpose: 'Identifies histiocytic and monocytic differentiation', samples: ['Biopsy', 'Excision'] },
  { name: 'CD163', fullName: 'CD163', function: 'Scavenger receptor on monocytes/macrophages', purpose: 'Specific histiocytic/macrophage marker', samples: ['Biopsy', 'Excision'] },
  { name: 'Langerin', fullName: 'Langerin (CD207)', function: 'C-type lectin on Langerhans cells', purpose: 'Identifies Langerhans cell histiocytosis', samples: ['Biopsy', 'Excision'] },
  { name: 'CD1a', fullName: 'CD1a', function: 'MHC-like molecule on Langerhans cells', purpose: 'Identifies Langerhans cell histiocytosis', samples: ['Biopsy', 'Excision'] },
  { name: 'BRAF V600E', fullName: 'BRAF V600E Mutant', function: 'Mutant serine/threonine kinase', purpose: 'Identifies BRAF-mutant melanoma, hairy cell leukemia, LCH', samples: ['Biopsy', 'Excision'] },
  { name: 'MMR Panel (MLH1)', fullName: 'MutL Homolog 1', function: 'DNA mismatch repair protein', purpose: 'Screens for Lynch syndrome / MSI', samples: ['Biopsy', 'Excision'], panel: 'MMR Panel' },
  { name: 'MMR Panel (MSH2)', fullName: 'MutS Homolog 2', function: 'DNA mismatch repair protein', purpose: 'Screens for Lynch syndrome / MSI', samples: ['Biopsy', 'Excision'], panel: 'MMR Panel' },
  { name: 'MMR Panel (MSH6)', fullName: 'MutS Homolog 6', function: 'DNA mismatch repair protein', purpose: 'Screens for Lynch syndrome / MSI', samples: ['Biopsy', 'Excision'], panel: 'MMR Panel' },
  { name: 'MMR Panel (PMS2)', fullName: 'Post-Meiotic Segregation 2', function: 'DNA mismatch repair protein', purpose: 'Screens for Lynch syndrome / MSI', samples: ['Biopsy', 'Excision'], panel: 'MMR Panel' },
  { name: 'Tryptase', fullName: 'Mast Cell Tryptase', function: 'Serine protease in mast cell granules', purpose: 'Identifies mastocytosis', samples: ['Biopsy', 'Excision'] },
  { name: 'CD25', fullName: 'CD25 (IL-2R alpha)', function: 'Interleukin-2 receptor alpha chain', purpose: 'Marks systemic mastocytosis (aberrant expression)', samples: ['Biopsy', 'Excision'] },
  { name: 'Melan-A (A103)', fullName: 'Melan-A Clone A103', function: 'Melanocyte differentiation antigen', purpose: 'Adrenal cortical tumors and melanocytic lesions', samples: ['Biopsy', 'Excision'] },
  { name: 'SF-1', fullName: 'Steroidogenic Factor 1', function: 'Nuclear receptor in steroidogenic tissues', purpose: 'Identifies adrenal cortical tumors', samples: ['Biopsy', 'Excision'] },
  { name: 'Caldesmon', fullName: 'h-Caldesmon', function: 'Actin and calmodulin-binding protein', purpose: 'Smooth muscle marker; differentiates leiomyosarcoma from other spindle cell tumors', samples: ['Biopsy', 'Excision'] },
  { name: 'MYC', fullName: 'MYC Proto-Oncogene', function: 'Transcription factor regulating cell cycle', purpose: 'Angiosarcoma (radiation-associated); Burkitt lymphoma', samples: ['Biopsy', 'Excision'] },
  { name: 'SOX2', fullName: 'SRY-Box Transcription Factor 2', function: 'Pluripotency transcription factor', purpose: 'Embryonal carcinoma, some squamous carcinomas', samples: ['Biopsy', 'Excision'] },
  { name: 'SATB2', fullName: 'Special AT-Rich Sequence-Binding Protein 2', function: 'Nuclear matrix protein', purpose: 'Colorectal carcinoma marker; osteoblastic tumors', samples: ['Biopsy', 'Excision'] },
  { name: 'Uroplakin III', fullName: 'Uroplakin III', function: 'Integral membrane protein of urothelium', purpose: 'Identifies urothelial carcinoma', samples: ['Biopsy', 'Excision'] },
  { name: 'Claudin-18.2', fullName: 'Claudin 18 Isoform 2', function: 'Tight junction protein in gastric mucosa', purpose: 'Therapeutic target in gastric/pancreatic cancer', samples: ['Biopsy', 'Excision'] },
  { name: 'NUT', fullName: 'Nuclear Protein in Testis (NUTM1)', function: 'Chromatin regulatory protein', purpose: 'Identifies NUT carcinoma (NMC)', samples: ['Biopsy', 'Excision'] },
  { name: 'SS18-SSX', fullName: 'SS18-SSX Fusion', function: 'Chimeric transcription factor', purpose: 'Diagnostic for synovial sarcoma', samples: ['Biopsy', 'Excision'] },
  { name: 'Myxovirus A', fullName: 'MxA Protein', function: 'Interferon-induced GTPase', purpose: 'Identifies dermatomyositis (type I interferon signature)', samples: ['Biopsy'] },
  { name: 'c-MYC', fullName: 'c-MYC Protein', function: 'Proto-oncogene transcription factor', purpose: 'Prognostic in DLBCL; diagnostic in Burkitt', samples: ['Biopsy', 'Excision'] },
  { name: 'LEF1', fullName: 'Lymphoid Enhancer-Binding Factor 1', function: 'Wnt signaling transcription factor', purpose: 'CLL marker; follicular lymphoma differentiation', samples: ['Biopsy', 'Excision'] },
  { name: 'SOX11', fullName: 'SRY-Box Transcription Factor 11', function: 'Transcription factor', purpose: 'Mantle cell lymphoma marker', samples: ['Biopsy', 'Excision'] },
  { name: 'CD2', fullName: 'CD2 (LFA-2)', function: 'T-cell surface adhesion molecule', purpose: 'T/NK-cell lineage marker', samples: ['Biopsy', 'Excision'] },
  { name: 'CD57', fullName: 'CD57 (HNK-1)', function: 'Carbohydrate epitope on NK cells', purpose: 'NK-cell marker; marks PTC rosettes', samples: ['Biopsy', 'Excision'] },
  { name: 'PD1', fullName: 'Programmed Death 1 (CD279)', function: 'Immune checkpoint receptor', purpose: 'T-follicular helper cell marker; AITL', samples: ['Biopsy', 'Excision'] },
  { name: 'Granzyme B', fullName: 'Granzyme B', function: 'Serine protease in cytotoxic granules', purpose: 'Cytotoxic T/NK-cell lymphomas', samples: ['Biopsy', 'Excision'] },
  { name: 'Perforin', fullName: 'Perforin', function: 'Pore-forming cytolytic protein', purpose: 'Cytotoxic T/NK-cell lymphomas', samples: ['Biopsy', 'Excision'] },
  { name: 'TIA-1', fullName: 'T-cell Intracellular Antigen 1', function: 'Cytolytic granule-associated RNA binding protein', purpose: 'Cytotoxic lymphocyte marker', samples: ['Biopsy', 'Excision'] },
  { name: 'EBER', fullName: 'EBV-Encoded Small RNA (ISH)', function: 'EBV non-coding RNA', purpose: 'Detects EBV in lymphomas, NPC, PTLD', samples: ['Biopsy', 'Excision'] },
  { name: 'LMP1', fullName: 'Latent Membrane Protein 1', function: 'EBV oncoprotein', purpose: 'Identifies EBV-associated Hodgkin and NPC', samples: ['Biopsy', 'Excision'] },
  { name: 'HHV8', fullName: 'Human Herpesvirus 8 (LANA)', function: 'Viral latency-associated nuclear antigen', purpose: 'Identifies Kaposi sarcoma, PEL, MCD', samples: ['Biopsy', 'Excision'] },
  { name: 'CMV', fullName: 'Cytomegalovirus', function: 'Viral antigen', purpose: 'Identifies CMV infection in tissues', samples: ['Biopsy'] },
  { name: 'HPV', fullName: 'Human Papillomavirus', function: 'Viral proteins', purpose: 'Identifies HPV-related carcinomas', samples: ['Biopsy', 'Excision'] },
  { name: 'Helicobacter', fullName: 'Helicobacter pylori', function: 'Bacterial antigen', purpose: 'Identifies H. pylori gastritis/MALT lymphoma', samples: ['Biopsy'] },
  { name: 'Congo Red', fullName: 'Congo Red (IHC confirmation)', function: 'Amyloid detection', purpose: 'Confirms amyloidosis with apple-green birefringence', samples: ['Biopsy'] },
  { name: 'Amyloid A', fullName: 'Serum Amyloid A', function: 'Acute phase protein', purpose: 'Identifies AA amyloidosis', samples: ['Biopsy'] },
  { name: 'Transthyretin', fullName: 'Transthyretin (Prealbumin)', function: 'Thyroid hormone transport protein', purpose: 'Identifies ATTR amyloidosis', samples: ['Biopsy'] },
];

// Immunofluorescence (IF) Markers
export const IF_MARKERS: ImmunoMarkerInfo[] = [
  // Renal IF Panel
  { name: 'IgA', fullName: 'Immunoglobulin A', function: 'Primary mucosal immunoglobulin', purpose: 'Diagnoses IgA nephropathy (Berger disease); Henoch-Schönlein purpura nephritis', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },
  { name: 'IgG', fullName: 'Immunoglobulin G', function: 'Major serum immunoglobulin', purpose: 'Identifies immune complex glomerulonephritis; membranous nephropathy', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },
  { name: 'IgM', fullName: 'Immunoglobulin M', function: 'Primary immune response immunoglobulin', purpose: 'IgM nephropathy; lupus nephritis; mesangial deposits', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },
  { name: 'C3', fullName: 'Complement Component 3', function: 'Central complement cascade protein', purpose: 'Identifies complement-mediated glomerulonephritis; C3 glomerulopathy', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },
  { name: 'C1q', fullName: 'Complement Component 1q', function: 'Initiator of classical complement pathway', purpose: 'Lupus nephritis (full-house pattern); C1q nephropathy', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },
  { name: 'C4', fullName: 'Complement Component 4', function: 'Classical/lectin pathway complement protein', purpose: 'Lupus nephritis; cryoglobulinemic GN', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },
  { name: 'Fibrinogen', fullName: 'Fibrinogen', function: 'Coagulation cascade glycoprotein', purpose: 'Fibrillary GN; crescentic GN; thrombotic microangiopathy', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },
  { name: 'Kappa (IF)', fullName: 'Kappa Light Chain (IF)', function: 'Immunoglobulin kappa light chain', purpose: 'Light chain restriction in monoclonal immunoglobulin deposition disease', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },
  { name: 'Lambda (IF)', fullName: 'Lambda Light Chain (IF)', function: 'Immunoglobulin lambda light chain', purpose: 'Light chain restriction; AL amyloidosis; LCDD', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },
  { name: 'Albumin', fullName: 'Albumin', function: 'Major plasma protein', purpose: 'Non-specific trapping marker; minimal change disease control', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },
  { name: 'PLA2R', fullName: 'Phospholipase A2 Receptor', function: 'Transmembrane receptor on podocytes', purpose: 'Primary membranous nephropathy (70-80% of cases)', samples: ['Fresh Frozen', 'Renal Biopsy', 'FFPE'], panel: 'Renal IF Panel' },
  { name: 'THSD7A', fullName: 'Thrombospondin Type 1 Domain 7A', function: 'Podocyte antigen', purpose: 'Primary membranous nephropathy (PLA2R-negative cases)', samples: ['Fresh Frozen', 'Renal Biopsy'], panel: 'Renal IF Panel' },

  // Skin IF Panel (Direct Immunofluorescence - DIF)
  { name: 'IgA (Skin)', fullName: 'IgA - Dermal', function: 'Mucosal immunoglobulin in skin', purpose: 'Dermatitis herpetiformis (granular at dermal papillae); Linear IgA bullous dermatosis', samples: ['Fresh Frozen', 'Skin Biopsy'], panel: 'Skin IF Panel' },
  { name: 'IgG (Skin)', fullName: 'IgG - Dermal', function: 'Serum immunoglobulin deposits in skin', purpose: 'Pemphigus (intercellular); Bullous pemphigoid (linear BMZ)', samples: ['Fresh Frozen', 'Skin Biopsy'], panel: 'Skin IF Panel' },
  { name: 'IgM (Skin)', fullName: 'IgM - Dermal', function: 'Immunoglobulin M in skin', purpose: 'Lupus band test; vasculitis', samples: ['Fresh Frozen', 'Skin Biopsy'], panel: 'Skin IF Panel' },
  { name: 'C3 (Skin)', fullName: 'C3 - Dermal', function: 'Complement component in skin', purpose: 'Bullous pemphigoid; pemphigus; lupus band test', samples: ['Fresh Frozen', 'Skin Biopsy'], panel: 'Skin IF Panel' },
  { name: 'Fibrinogen (Skin)', fullName: 'Fibrinogen - Dermal', function: 'Coagulation protein in skin vessels', purpose: 'Vasculitis; lupus band test', samples: ['Fresh Frozen', 'Skin Biopsy'], panel: 'Skin IF Panel' },

  // Autoimmune / ANA Panel
  { name: 'ANA', fullName: 'Anti-Nuclear Antibody', function: 'Autoantibodies against nuclear components', purpose: 'Screening for SLE, Sjögren, scleroderma, MCTD', samples: ['Serum', 'HEp-2 Cells'], panel: 'Autoimmune IF Panel' },
  { name: 'Anti-dsDNA', fullName: 'Anti-double-stranded DNA', function: 'Autoantibody against native DNA', purpose: 'Highly specific for SLE; correlates with disease activity', samples: ['Serum', 'Crithidia luciliae'], panel: 'Autoimmune IF Panel' },
  { name: 'ANCA (c-ANCA)', fullName: 'Cytoplasmic Anti-Neutrophil Cytoplasmic Antibody', function: 'Autoantibody with cytoplasmic staining pattern', purpose: 'Granulomatosis with polyangiitis (Wegener); PR3 specificity', samples: ['Serum', 'Neutrophils'], panel: 'Autoimmune IF Panel' },
  { name: 'ANCA (p-ANCA)', fullName: 'Perinuclear Anti-Neutrophil Cytoplasmic Antibody', function: 'Autoantibody with perinuclear staining pattern', purpose: 'Microscopic polyangiitis; EGPA; MPO specificity', samples: ['Serum', 'Neutrophils'], panel: 'Autoimmune IF Panel' },
  { name: 'Anti-GBM', fullName: 'Anti-Glomerular Basement Membrane', function: 'Autoantibody against type IV collagen', purpose: 'Goodpasture syndrome; anti-GBM disease', samples: ['Serum', 'Fresh Frozen', 'Renal Biopsy'], panel: 'Autoimmune IF Panel' },
  { name: 'Anti-Smooth Muscle', fullName: 'Anti-Smooth Muscle Antibody (ASMA)', function: 'Autoantibody against smooth muscle antigens', purpose: 'Autoimmune hepatitis type 1', samples: ['Serum', 'Rat Tissue'], panel: 'Autoimmune IF Panel' },
  { name: 'Anti-Mitochondrial', fullName: 'Anti-Mitochondrial Antibody (AMA)', function: 'Autoantibody against mitochondrial antigens', purpose: 'Primary biliary cholangitis (90-95% positive)', samples: ['Serum', 'Rat Tissue'], panel: 'Autoimmune IF Panel' },
  { name: 'Anti-Endomysial', fullName: 'Anti-Endomysial Antibody (EMA)', function: 'IgA autoantibody against endomysium', purpose: 'Celiac disease confirmation (highly specific)', samples: ['Serum', 'Monkey Esophagus'], panel: 'Autoimmune IF Panel' },

  // FISH / Fluorescence Markers (used in IF context)
  { name: 'FISH HER2', fullName: 'HER2 Fluorescence In Situ Hybridization', function: 'Detects HER2 gene amplification', purpose: 'Confirms HER2 status for targeted therapy in breast cancer', samples: ['FFPE', 'Excision', 'Cell Block'], panel: 'FISH Panel' },
  { name: 'FISH ALK', fullName: 'ALK Break-Apart FISH', function: 'Detects ALK gene rearrangements', purpose: 'Identifies ALK-rearranged lung adenocarcinoma for targeted therapy', samples: ['FFPE', 'Excision'], panel: 'FISH Panel' },
  { name: 'FISH ROS1', fullName: 'ROS1 Break-Apart FISH', function: 'Detects ROS1 gene rearrangements', purpose: 'Identifies ROS1-rearranged NSCLC for Crizotinib therapy', samples: ['FFPE', 'Excision'], panel: 'FISH Panel' },
  { name: 'FISH MYC', fullName: 'MYC Break-Apart FISH', function: 'Detects MYC gene rearrangement', purpose: 'Burkitt lymphoma; double-hit DLBCL', samples: ['FFPE', 'Excision'], panel: 'FISH Panel' },
  { name: 'FISH BCL2', fullName: 'BCL2 Break-Apart FISH', function: 'Detects BCL2 gene rearrangement', purpose: 'Follicular lymphoma; double-hit DLBCL', samples: ['FFPE', 'Excision'], panel: 'FISH Panel' },
  { name: 'FISH BCL6', fullName: 'BCL6 Break-Apart FISH', function: 'Detects BCL6 gene rearrangement', purpose: 'DLBCL subclassification', samples: ['FFPE', 'Excision'], panel: 'FISH Panel' },
  { name: 'FISH EWSR1', fullName: 'EWSR1 Break-Apart FISH', function: 'Detects EWSR1 gene rearrangement', purpose: 'Ewing sarcoma confirmation', samples: ['FFPE', 'Excision'], panel: 'FISH Panel' },
  { name: 'FISH MDM2', fullName: 'MDM2 Amplification FISH', function: 'Detects MDM2 gene amplification', purpose: 'Well-differentiated/dedifferentiated liposarcoma', samples: ['FFPE', 'Excision'], panel: 'FISH Panel' },
  { name: 'FISH 1p/19q', fullName: '1p/19q Co-deletion FISH', function: 'Detects chromosomal co-deletion', purpose: 'Oligodendroglioma diagnosis (IDH-mutant, 1p/19q codeleted)', samples: ['FFPE', 'Excision'], panel: 'FISH Panel' },
  { name: 'FISH SS18', fullName: 'SS18 (SYT) Break-Apart FISH', function: 'Detects SS18 gene rearrangement', purpose: 'Synovial sarcoma confirmation', samples: ['FFPE', 'Excision'], panel: 'FISH Panel' },
];

export const DETECTION_KITS: DetectionKitInfo[] = [
  { name: 'EnVision FLEX', fullName: 'Dako EnVision FLEX Detection System', function: 'Dextran polymer-based HRP detection', purpose: 'Universal IHC detection for FFPE tissue', samples: ['Biopsy', 'Excision', 'Cell Block'] },
  { name: 'EnVision FLEX+', fullName: 'Dako EnVision FLEX+ High pH Detection', function: 'Enhanced dextran polymer with linker', purpose: 'Amplified detection for weak-expressing antigens', samples: ['Biopsy', 'Excision'] },
  { name: 'OptiView DAB', fullName: 'Ventana OptiView DAB IHC Detection Kit', function: 'Multimer-based HRP detection', purpose: 'Automated IHC detection on Ventana systems', samples: ['Biopsy', 'Excision'] },
  { name: 'UltraView DAB', fullName: 'Ventana UltraView Universal DAB Detection', function: 'Multimer-based enzyme conjugate', purpose: 'Standard automated IHC detection', samples: ['Biopsy', 'Excision'] },
  { name: 'BenchMark ULTRA', fullName: 'Ventana BenchMark ULTRA Detection', function: 'Fully automated staining system', purpose: 'High-throughput automated IHC/ISH', samples: ['Biopsy', 'Excision'] },
  { name: 'Bond Polymer Refine', fullName: 'Leica Bond Polymer Refine Detection', function: 'Compact polymer HRP detection', purpose: 'Automated IHC on Leica Bond systems', samples: ['Biopsy', 'Excision'] },
  { name: 'Bond Polymer Refine Red', fullName: 'Leica Bond Polymer Refine Red Detection', function: 'Compact polymer AP detection with Fast Red', purpose: 'Dual staining and melanin-rich tissues', samples: ['Biopsy', 'Excision'] },
  { name: 'PowerVision', fullName: 'Leica PowerVision+ Poly-HRP', function: 'Poly-HRP anti-mouse/rabbit', purpose: 'High sensitivity manual/automated IHC', samples: ['Biopsy', 'Excision'] },
  { name: 'Novolink', fullName: 'Leica Novolink Polymer Detection System', function: 'Post-primary block and polymer HRP', purpose: 'Manual IHC with enhanced sensitivity', samples: ['Biopsy', 'Excision'] },
  { name: 'ImmPRESS', fullName: 'Vector ImmPRESS Universal Detection', function: 'Micropolymer enzyme conjugate', purpose: 'Universal manual IHC detection', samples: ['Biopsy', 'Excision'] },
  { name: 'REAL EnVision', fullName: 'Dako REAL EnVision Detection', function: 'HRP-labeled polymer for rabbit/mouse', purpose: 'Manual IHC detection', samples: ['Biopsy', 'Excision'] },
  { name: 'HiDef Detection', fullName: 'Cell Marque HiDef Detection HRP', function: 'Amplifier and polymer-HRP system', purpose: 'Enhanced sensitivity IHC', samples: ['Biopsy', 'Excision'] },
  { name: 'PolyDetector', fullName: 'Bio SB PolyDetector Plus DAB', function: 'Non-biotin polymer detection', purpose: 'Biotin-free IHC to reduce background', samples: ['Biopsy', 'Excision'] },
  { name: 'SuperPicTure', fullName: 'Invitrogen SuperPicTure Polymer Detection', function: 'Broad-spectrum polymer HRP', purpose: 'Rapid manual IHC detection', samples: ['Biopsy', 'Excision'] },
  { name: 'MACH4', fullName: 'Biocare MACH 4 Universal HRP-Polymer', function: 'Universal AP/HRP polymer', purpose: 'Automated and manual IHC', samples: ['Biopsy', 'Excision'] },
];

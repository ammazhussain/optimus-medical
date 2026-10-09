/* Optimus Medical: equipment catalogue (placeholder data).
   Shared by inventory.html and contact.html. Loaded as a classic script so pages
   also work when opened straight from a folder. The CMS will replace this file. */
/* =========================================================
   DATA
   Placeholder equipment. Each object has the shape the CMS will
   store later (see AMENDMENTS.md, "Data model"):
     id, name, model, department, image, spec
   Replace this array with a fetch from the CMS when it exists.
   ========================================================= */
var IMG = function (id) { return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=640&h=640&q=70"; };
var DEPARTMENTS = [
  { id: "monitoring", name: "Patient monitoring" },
  { id: "imaging",    name: "Diagnostic imaging" },
  { id: "surgical",   name: "Surgical" },
  { id: "care",       name: "Beds and patient care" },
  { id: "lab",        name: "Laboratory" },
  { id: "neonatal",   name: "Neonatal" }
];
var EQUIPMENT = [
  { id: "pm-01", name: "Multi-parameter patient monitor", model: "Model PM-12", department: "monitoring", image: IMG("1513224502586-d1e602410265"), spec: "12.1 in display, 6 parameters" },
  { id: "pm-02", name: "Bedside vital signs monitor",     model: "Model VS-8",  department: "monitoring", image: IMG("1664902265139-934219cee42f"), spec: "NIBP, SpO2, temperature" },
  { id: "pm-03", name: "12-lead ECG machine",             model: "Model ECG-1200", department: "monitoring", image: IMG("1630531210843-d6f343ad1f90"), spec: "Interpretive, thermal printer" },
  { id: "pm-04", name: "Central monitoring station",      model: "Model CMS-32", department: "monitoring", image: IMG("1666214280250-41f16ba24a26"), spec: "Up to 32 beds" },
  { id: "pm-05", name: "Pulse oximeter",                  model: "Model OX-2",  department: "monitoring", image: IMG("1603398938378-e54eab446dde"), spec: "Handheld, rechargeable" },

  { id: "im-01", name: "Colour Doppler ultrasound",       model: "Model US-70",  department: "imaging", image: IMG("1691935071222-c008a4ccc2ca"), spec: "4 probe ports, cart based" },
  { id: "im-02", name: "Portable ultrasound",             model: "Model US-P5",  department: "imaging", image: IMG("1691933880096-4046bc9e2fa0"), spec: "Laptop format, 2 probes" },
  { id: "im-03", name: "Ultrasound workstation",          model: "Model US-W3",  department: "imaging", image: IMG("1691933880037-ce9d151ab922"), spec: "Obstetric and cardiac presets" },
  { id: "im-04", name: "Mobile X-ray unit",               model: "Model XR-M4",  department: "imaging", image: IMG("1691933880082-8ca234497bf4"), spec: "Digital, battery driven" },

  { id: "sx-01", name: "LED surgical light",              model: "Model OL-160", department: "surgical", image: IMG("1551076805-e1869033e561"), spec: "Twin head, 160,000 lux" },
  { id: "sx-02", name: "Electric operating table",        model: "Model OT-E7",  department: "surgical", image: IMG("1516549655169-df83a0774514"), spec: "Remote control, radiolucent top" },
  { id: "sx-03", name: "Anaesthesia workstation",         model: "Model AW-5",   department: "surgical", image: IMG("1504439468489-c8920d796a29"), spec: "Integrated ventilator" },
  { id: "sx-04", name: "Electrosurgical unit",            model: "Model ES-300", department: "surgical", image: IMG("1512102438733-bfa4ed29aef7"), spec: "Mono and bipolar, 300 W" },

  { id: "pc-01", name: "Five-function ICU bed",          model: "Model ICU-5",  department: "care", image: IMG("1538108149393-fbbd81895907"), spec: "Electric, CPR release" },
  { id: "pc-02", name: "Manual ward bed",                model: "Model WB-3",   department: "care", image: IMG("1611587266737-cc128ffe2946"), spec: "Three crank, side rails" },
  { id: "pc-03", name: "Infusion pump",                   model: "Model IP-1",   department: "care", image: IMG("1710074213379-2a9c2653046a"), spec: "Volumetric, drug library" },
  { id: "pc-04", name: "Patient room package",            model: "Model PR-2",   department: "care", image: IMG("1710074213374-e68503a1b795"), spec: "Bed, locker, overbed table" },

  { id: "lb-01", name: "Haematology analyser",            model: "Model HA-5",   department: "lab", image: IMG("1579165466949-3180a3d056d5"), spec: "5-part differential" },
  { id: "lb-02", name: "Laboratory centrifuge",           model: "Model CF-24",  department: "lab", image: IMG("1578496480240-32d3e0c04525"), spec: "24 tubes, digital timer" },
  { id: "lb-03", name: "Chemistry analyser",              model: "Model CA-200", department: "lab", image: IMG("1581093577421-f561a654a353"), spec: "200 tests per hour" },
  { id: "lb-04", name: "Biosafety cabinet",               model: "Model BSC-2",  department: "lab", image: IMG("1582719299076-dd3f6f970dd4"), spec: "Class II, HEPA filtered" },

  { id: "nn-01", name: "Infant incubator",                model: "Model IN-30",  department: "neonatal", image: IMG("1517120026326-d87759a7b63b"), spec: "Servo controlled" },
  { id: "nn-02", name: "Infant radiant warmer",           model: "Model RW-2",   department: "neonatal", image: IMG("1576091160550-2173dba999ef"), spec: "Apgar timer, tilting bed" },
  { id: "nn-03", name: "Phototherapy unit",               model: "Model PT-4",   department: "neonatal", image: IMG("1505751172876-fa1923c5c528"), spec: "LED, adjustable height" }
];

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwjhkpqtdsscitgpdbsj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3amhrcHF0ZHNzY2l0Z3BkYnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTc2ODMsImV4cCI6MjA5MDIzMzY4M30.XiL_cVw7qCgm-taxCQdH2Lu4jN_YCYxu7krI9oBYQNU'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Catalog data ─────────────────────────────────────────────────────────────
// Structure: { section, items: [{ name, costRows: [{ name }] }] }

const catalog = [
  {
    section: 'Preconstruction',
    items: [
      { name: 'Design', costRows: [] },
      {
        name: 'Engineering - Pool Shell',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Engineering - Retaining Wall',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Engineering - Deck Typical',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Engineering - Deck Custom',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Engineering - Shrink Swell',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Permits - Building',
        costRows: [
          { name: 'Permit fee' },
          { name: 'Management labor' },
        ],
      },
      {
        name: 'Permits - Zoning',
        costRows: [
          { name: 'Permit fee' },
          { name: 'Management labor' },
        ],
      },
      {
        name: 'Permits - Health Department',
        costRows: [
          { name: 'Permit fee' },
          { name: 'Management labor' },
        ],
      },
      {
        name: 'Permits - Environmental',
        costRows: [
          { name: 'Permit fee' },
          { name: 'Management labor' },
        ],
      },
      {
        name: 'Permits - Electrical',
        costRows: [
          { name: 'Permit fee' },
          { name: 'Management labor' },
        ],
      },
      {
        name: 'Permits - Gas',
        costRows: [
          { name: 'Permit fee' },
          { name: 'Management labor' },
        ],
      },
      {
        name: 'Permits - Inspections County',
        costRows: [
          { name: 'Inspection fee' },
        ],
      },
      {
        name: 'Permits - Inspections Third Party',
        costRows: [
          { name: 'Inspection fee' },
        ],
      },
    ],
  },
  {
    section: 'Site Preparation',
    items: [
      {
        name: 'Safety Fence',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Silt Fence',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Portable Toilet',
        costRows: [
          { name: 'Each company' },
        ],
      },
      {
        name: 'Limb Removal - Stump Grinding',
        costRows: [
          { name: 'Labor' },
          { name: 'Equipment' },
        ],
      },
      {
        name: 'Limb Removal - Small Trees',
        costRows: [
          { name: 'Labor' },
          { name: 'Equipment' },
        ],
      },
      {
        name: 'Limb Removal - Limbs',
        costRows: [
          { name: 'Labor' },
        ],
      },
      {
        name: 'Misc. Demolition - Old Wood Deck',
        costRows: [
          { name: 'Labor' },
          { name: 'Disposal' },
        ],
      },
      {
        name: 'Misc. Demolition - Old Patio',
        costRows: [
          { name: 'Labor' },
          { name: 'Disposal' },
        ],
      },
    ],
  },
  {
    section: 'Excavation',
    items: [
      {
        name: 'Gravel 68',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Gravel 57',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Dirt Hauling',
        costRows: [
          { name: 'Hauling company' },
        ],
      },
      {
        name: 'Ground Protection Mats',
        costRows: [
          { name: 'Rental' },
        ],
      },
      {
        name: 'Mobilization (3 minimum)',
        costRows: [
          { name: 'Equipment mobilization' },
        ],
      },
      {
        name: 'Machinery Hours',
        costRows: [
          { name: 'Equipment hours' },
          { name: 'Operator labor' },
        ],
      },
      {
        name: 'Electrical Trench',
        costRows: [
          { name: 'Labor' },
          { name: 'Equipment' },
        ],
      },
      {
        name: 'Plumbing Trench',
        costRows: [
          { name: 'Labor' },
          { name: 'Equipment' },
        ],
      },
      {
        name: 'Grading',
        costRows: [
          { name: 'Labor' },
          { name: 'Equipment' },
        ],
      },
      {
        name: 'Rock Digging',
        costRows: [
          { name: 'Labor' },
          { name: 'Equipment' },
        ],
      },
      {
        name: 'Rock Hauling',
        costRows: [
          { name: 'Hauling company' },
        ],
      },
      {
        name: 'Tree Removal',
        costRows: [
          { name: 'Labor' },
          { name: 'Equipment' },
        ],
      },
      {
        name: 'Stump Removal',
        costRows: [
          { name: 'Labor' },
          { name: 'Equipment' },
        ],
      },
    ],
  },
  {
    section: 'Plumbing',
    items: [
      {
        name: 'PVC (fittings, glue and primers)',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Fixtures - Skimmers',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Fixtures - Returns',
        costRows: [
          { name: 'Wall fittings for returns/eyeballs' },
          { name: 'Wall fittings for lights' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Fixtures - Main Drains',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Fixtures - Bubblers',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Fixtures - Spa Jets',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Fixtures - Deck Jets',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Fixtures - LED Jets',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Fixtures - Waterfall',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Plumbing Labor',
        costRows: [
          { name: 'Labor' },
        ],
      },
    ],
  },
  {
    section: 'Electrical',
    items: [
      {
        name: 'Bond Wire',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Conduit (glue)',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Electrical Wall',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Electrical Labor',
        costRows: [
          { name: 'Labor' },
        ],
      },
      {
        name: 'Electrical Panel',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Outlet (2 is standard)',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Light - Junction Box',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Light - Transformer',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Light - Labor',
        costRows: [
          { name: 'Labor' },
        ],
      },
    ],
  },
  {
    section: 'Gas',
    items: [
      {
        name: 'Heater Labor/Materials',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Gas Trench',
        costRows: [
          { name: 'Labor' },
          { name: 'Equipment' },
        ],
      },
      {
        name: 'Firepit Labor/Material',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
    ],
  },
  {
    section: 'Equipment',
    items: [
      {
        name: 'Equipment Pad',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pump',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pump Controller',
        costRows: [
          { name: 'Controller cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Filter - Cartridge',
        costRows: [
          { name: 'Cartridge' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Filter - Sand',
        costRows: [
          { name: 'Sand' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Chlorinator - Salt',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Chlorinator - Direct Chlorination',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Heater - Gas Natural',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Heater - Gas Propane',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Heater - Electrical',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Automation',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Cleaner',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Blower',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Valves',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Zinc Anode and Other Standard',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Lights - White',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Lights - Colorful',
        costRows: [
          { name: 'Equipment cost' },
          { name: 'Switch controller' },
          { name: 'Labor' },
        ],
      },
    ],
  },
  {
    section: 'Pool Shell',
    items: [
      {
        name: 'Shell',
        costRows: [
          { name: 'Shell cost' },
          { name: 'Tax' },
        ],
      },
      {
        name: 'Delivery Mileage',
        costRows: [
          { name: 'Delivery cost' },
        ],
      },
    ],
  },
  {
    section: 'Crane',
    items: [
      {
        name: 'Crane - Smaller (30 tons)',
        costRows: [
          { name: 'Crane cost' },
        ],
      },
      {
        name: 'Crane - Medium (45 tons)',
        costRows: [
          { name: 'Crane cost' },
        ],
      },
      {
        name: 'Crane - Larger (60 tons)',
        costRows: [
          { name: 'Crane cost' },
        ],
      },
    ],
  },
  {
    section: 'Water Truck',
    items: [
      {
        name: 'Water Truck - Mileage and Gallons',
        costRows: [
          { name: 'Mileage cost' },
          { name: 'Gallons cost' },
        ],
      },
    ],
  },
  {
    section: 'Bond Beam',
    items: [
      {
        name: 'Bond Beam',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
    ],
  },
  {
    section: 'Coping',
    items: [
      {
        name: 'Coping - Concrete Z Forms',
        costRows: [
          { name: 'Z Forms' },
          { name: 'Labor' },
          { name: 'Concrete' },
        ],
      },
      {
        name: 'Coping - Paver',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
    ],
  },
  {
    section: 'Pool Deck',
    items: [
      {
        name: 'Linear Deck Drains',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Concrete - Brushed',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Concrete - Stamped',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pavers',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Travertine/Marble',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
    ],
  },
  {
    section: 'Pool Cover',
    items: [
      {
        name: 'Winter Cover',
        costRows: [
          { name: 'Installation' },
          { name: 'Cover' },
        ],
      },
      {
        name: 'Autocover',
        costRows: [
          { name: 'Installation' },
          { name: 'Cover' },
        ],
      },
    ],
  },
  {
    section: 'Pool Care',
    items: [
      {
        name: 'Maintenance Kit',
        costRows: [
          { name: 'Kit cost' },
        ],
      },
      {
        name: 'Pool School',
        costRows: [
          { name: 'Labor' },
        ],
      },
      {
        name: 'Equipment Start Up',
        costRows: [
          { name: 'Labor' },
        ],
      },
      {
        name: 'Pool Closing',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Pool Service',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
    ],
  },
  {
    section: 'Fence',
    items: [
      {
        name: 'Fence - Aluminum',
        costRows: [
          { name: 'Gates' },
          { name: 'Material (linear ft)' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Fence - Vinyl',
        costRows: [
          { name: 'Gates' },
          { name: 'Material (linear ft)' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Fence - Wood',
        costRows: [
          { name: 'Gates' },
          { name: 'Material (linear ft)' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Fence - Rail',
        costRows: [
          { name: 'Gates' },
          { name: 'Material (linear ft)' },
          { name: 'Labor' },
        ],
      },
    ],
  },
  {
    section: 'Retaining Wall',
    items: [
      {
        name: 'Retaining Wall - Drainage',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Retaining Wall - Concrete',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Retaining Wall - CMU',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Retaining Wall - Block (Belgard a)',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Retaining Wall - Block (Belgard b)',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Retaining Wall - Stone Veneer',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
    ],
  },
  {
    section: 'Landscaping',
    items: [
      {
        name: 'Hay and Seed',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Lighting - Path',
        costRows: [
          { name: 'Materials' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Lighting - Hardscape Step',
        costRows: [
          { name: 'Materials' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Lighting - Puck Lights',
        costRows: [
          { name: 'Materials' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Sod',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Turf',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Gravel',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Stones',
        costRows: [
          { name: 'Landscape fabric' },
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Mulch',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
      {
        name: 'Drainage',
        costRows: [
          { name: 'Labor' },
          { name: 'Materials' },
        ],
      },
    ],
  },
  {
    section: 'Alarms',
    items: [
      {
        name: 'Alarms',
        costRows: [
          { name: 'Labor' },
          { name: 'Material' },
        ],
      },
    ],
  },
  {
    section: 'Misc. Costs',
    items: [
      {
        name: 'Misc. Costs (1%)',
        costRows: [
          { name: 'Misc. cost' },
        ],
      },
    ],
  },
  {
    section: 'Warranty',
    items: [
      {
        name: 'Warranty',
        costRows: [
          { name: 'Warranty cost' },
        ],
      },
    ],
  },
  {
    section: 'Accessories',
    items: [
      {
        name: 'Lounge Chairs',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Handrails',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Volleyball Net',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Ladder',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Slide',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
    ],
  },
  {
    section: 'Speakers',
    items: [
      {
        name: 'Individual Speakers',
        costRows: [
          { name: 'Speaker cost' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Electrical Material Components',
        costRows: [
          { name: 'Material' },
          { name: 'Labor' },
        ],
      },
      {
        name: 'Electrician Labor',
        costRows: [
          { name: 'Labor' },
        ],
      },
    ],
  },
  {
    section: 'Fire Features',
    items: [
      {
        name: 'Fire Features - Gas',
        costRows: [
          { name: 'Gas technician labor' },
          { name: 'Gas lines' },
        ],
      },
    ],
  },
]

// ─── Seed function ────────────────────────────────────────────────────────────

async function seed() {
  console.log('Starting catalog seed...')

  for (const entry of catalog) {
    // 1. Insert section
    const { data: sectionData, error: sectionError } = await supabase
      .from('catalog_sections')
      .insert([{ name: entry.section }])
      .select()
      .single()

    if (sectionError) {
      console.error(`Failed to insert section "${entry.section}":`, sectionError.message)
      continue
    }

    console.log(`✓ Section: ${entry.section}`)

    for (const item of entry.items) {
      // 2. Insert item
      const { data: itemData, error: itemError } = await supabase
        .from('catalog_items')
        .insert([{
          name: item.name,
          description: '',
          unit: '',
          section_id: sectionData.id,
        }])
        .select()
        .single()

      if (itemError) {
        console.error(`  Failed to insert item "${item.name}":`, itemError.message)
        continue
      }

      console.log(`  ✓ Item: ${item.name}`)

      // 3. Insert cost rows
      for (const row of item.costRows) {
        const { error: rowError } = await supabase
          .from('catalog_cost_rows')
          .insert([{
            item_id: itemData.id,
            name: row.name,
            unit: '',
            unit_cost: 0,
          }])

        if (rowError) {
          console.error(`    Failed to insert cost row "${row.name}":`, rowError.message)
          continue
        }

        console.log(`    ✓ Cost row: ${row.name}`)
      }
    }
  }

  console.log('\nSeed complete!')
}

seed()
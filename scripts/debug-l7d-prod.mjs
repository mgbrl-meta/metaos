const baseUrl = process.argv[2] || "https://metaos-seven.vercel.app";
const needle = (process.argv[3] || "ugcwithmuski").toLowerCase();

function n(value) {
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/%/g, "")
    .trim();

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function dateKey(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "") return "";

  const raw = String(rawValue).trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const y = slash[3];

    // Print-safe interpretation:
    // If first number > 12, it must be DD/MM.
    // If second number > 12, it must be MM/DD.
    // If ambiguous, we keep DD/MM because your Meta export visually shows DD/MM.
    if (a > 12) {
      return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }

    if (b > 12) {
      return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    }

    return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }

  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 30000 && serial < 60000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(serial));
    return epoch.toISOString().slice(0, 10);
  }

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return raw;
}

function addDays(key, days) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getRevenue(row) {
  return n(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.conversionValue ??
      row.conversion_value ??
      row["Purchases conversion value"] ??
      0
  );
}

async function read(source) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/meta-sheet?source=${source}`;
  console.log(`\n===== Fetching ${url} =====`);

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();

  console.log("API source:", json.source);
  console.log("sheetTab:", json.sheetTab);
  console.log("rowCount:", json.rowCount);
  console.log("fallbackUsed:", json.fallbackUsed);

  if (!res.ok) {
    console.log(json);
    process.exit(1);
  }

  const rows = (json.rows || []).filter((row) => {
    const text = [
      row.adName,
      row.ad_name,
      row.creativeName,
      row.creative_name,
      row.campaignName,
      row.campaign_name,
      row.adSetName,
      row.adsetName,
      row.adset_name,
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(needle);
  });

  console.log("Matched rows:", rows.length);

  const allDateKeys = (json.rows || [])
    .map((row) => dateKey(row.date ?? row.day ?? row.Date ?? row.Day))
    .filter(Boolean)
    .sort();

  const globalLatest = allDateKeys.at(-1);
  const start7 = addDays(globalLatest, -6);

  console.log("GLOBAL latest date:", globalLatest);
  console.log("Expected L7D window:", start7, "to", globalLatest);

  const printRows = rows
    .map((row) => {
      const key = dateKey(row.date ?? row.day ?? row.Date ?? row.Day);
      const spend = n(row.spend ?? row.amountSpent ?? row.amount_spent);
      const purchases = n(row.purchases);
      const revenue = getRevenue(row);

      return {
        rawDate: row.date ?? row.day ?? row.Date ?? row.Day,
        key,
        included: key >= start7 && key <= globalLatest,
        spend,
        purchases,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        cpa: purchases > 0 ? spend / purchases : 0,
        adName: row.adName ?? row.ad_name,
        adId: row.adId ?? row.ad_id,
      };
    })
    .sort((a, b) => String(a.key).localeCompare(String(b.key)));

  console.table(
    printRows.map((r) => ({
      rawDate: r.rawDate,
      parsedDate: r.key,
      included: r.included,
      spend: Math.round(r.spend),
      purchases: r.purchases,
      revenue: Math.round(r.revenue),
      cpa: Math.round(r.cpa),
      roas: r.roas.toFixed(2),
      adId: r.adId,
    }))
  );

  const total = printRows
    .filter((r) => r.included)
    .reduce(
      (acc, r) => {
        acc.spend += r.spend;
        acc.purchases += r.purchases;
        acc.revenue += r.revenue;
        return acc;
      },
      { spend: 0, purchases: 0, revenue: 0 }
    );

  console.log("Computed L7D from API rows:");
  console.log({
    spend: total.spend,
    purchases: total.purchases,
    revenue: total.revenue,
    cpa: total.purchases > 0 ? total.spend / total.purchases : 0,
    roas: total.spend > 0 ? total.revenue / total.spend : 0,
  });
}

await read("cache").catch((e) => console.log("CACHE ERROR", e.message));
await read("raw").catch((e) => console.log("RAW ERROR", e.message));

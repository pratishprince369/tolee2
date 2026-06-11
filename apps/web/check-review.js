const fs = require('fs');
const path = require('path');

const targetDirectories = [
  path.join(__dirname, 'src', 'actions'),
  path.join(__dirname, 'src', 'lib'),
  path.join(__dirname, 'src', 'app', 'api')
];

let totalVulnerabilities = 0;
let totalWarnings = 0;
const reports = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(__dirname, filePath);

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 1. Secret Leak Checks
    if (
      /(password|secret|key|token|database_url|api_key)\s*[:=]\s*['"`][a-zA-Z0-9_\-]{8,}['"`]/gi.test(line) &&
      !line.includes("process.env") &&
      !line.includes("authOptions") &&
      !filePath.endsWith(".example") &&
      !line.includes("global")
    ) {
      totalVulnerabilities++;
      reports.push({
        file: relativePath,
        line: lineNum,
        severity: "CRITICAL",
        type: "Secret Leak Detected",
        description: `Exposed hardcoded secret key or URL pattern: "${line.trim().substring(0, 40)}..."`,
        fix: "Move all keys to server-side .env environment variables immediately."
      });
    }

    // 2. SQL Injection Check
    if (
      /\.\$queryRawUnsafe\(/gi.test(line) ||
      (/prisma\..*\.findMany\(.*where.*[\+\`].*\$.*/gi.test(line) && !line.includes("prisma.$transaction"))
    ) {
      totalVulnerabilities++;
      reports.push({
        file: relativePath,
        line: lineNum,
        severity: "HIGH",
        type: "SQL Injection Risk",
        description: "Raw SQL query or unparameterized database query concatenation detected.",
        fix: "Use parameterized queries or standard Prisma query parameters (avoid $queryRawUnsafe)."
      });
    }

    // 3. XSS Vulnerability Check
    if (
      /dangerouslySetInnerHTML/gi.test(line) ||
      (/innerHTML\s*=/gi.test(line) && !filePath.includes("check-review.js"))
    ) {
      totalWarnings++;
      reports.push({
        file: relativePath,
        line: lineNum,
        severity: "MEDIUM",
        type: "XSS Vulnerability",
        description: "Usage of dangerouslySetInnerHTML or innerHTML found, allowing script injections.",
        fix: "Sanitize HTML using sanitizeHTML() or use standard secure text interpolation."
      });
    }
  });

  // 4. Rate Limiting Check for Public API Route files or public Server Actions
  const isActionFile = filePath.includes("src" + path.sep + "actions");
  const isApiRouteFile = filePath.includes("route.ts") && filePath.includes("api");
  
  if (isActionFile || isApiRouteFile) {
    const hasRateLimiterImport = /rate-limit/gi.test(content);
    const hasRateLimitCheck = /(writeLimiter|authLimiter|readLimiter|apiRateLimiter)\.isRateLimited/gi.test(content);
    
    // Flag if none is found for actions containing critical mutations (create/update/delete/send)
    const isMutationFile = /(create|delete|update|send|transfer)/gi.test(content);
    
    if (isMutationFile && (!hasRateLimiterImport || !hasRateLimitCheck)) {
      // Exclude simple fetch actions to keep alerts high-value
      if (!relativePath.endsWith("search.ts") && !relativePath.endsWith("world.ts") && !relativePath.endsWith("calls.ts")) {
        totalWarnings++;
        reports.push({
          file: relativePath,
          line: "FILE",
          severity: "MEDIUM",
          type: "Missing Rate Limiter",
          description: "This mutation endpoint does not appear to enforce rate-limiting boundaries.",
          fix: "Import { writeLimiter, getClientIp } and check writeLimiter.isRateLimited(ip) on entry."
        });
      }
    }
  }
}

function traverseDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverseDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      scanFile(fullPath);
    }
  });
}

console.log("\n=======================================================");
console.log("🛡️  Tolee.in Local Security Reviewer & Audit Scanner");
console.log("=======================================================");
console.log("Scanning target directories for secrets, SQLi, XSS, and rate limits...");

targetDirectories.forEach(dir => traverseDirectory(dir));

console.log("\n=======================================================");
console.log("📊 SECURITY REPORT SUMMARY");
console.log("=======================================================");
console.log(`🔍 Files Scanned:  ${reports.length > 0 ? Array.from(new Set(reports.map(r => r.file))).length : 0}`);
console.log(`🚨 Critical Vulnerabilities:  \x1b[31m${totalVulnerabilities}\x1b[0m`);
console.log(`⚠️ Warnings / Improvements:  \x1b[33m${totalWarnings}\x1b[0m`);
console.log("=======================================================\n");

if (reports.length === 0) {
  console.log("\x1b[32m✔ CONGRATULATIONS! No security vulnerabilities or missing rate limits detected. The code looks enterprise-grade safe! 🚀\x1b[0m\n");
  process.exit(0);
} else {
  console.log("📋 DETAILED ISSUES LEDGER:\n");
  reports.forEach((r, i) => {
    const color = r.severity === "CRITICAL" || r.severity === "HIGH" ? "\x1b[31m" : "\x1b[33m";
    console.log(`[${i + 1}] ${color}${r.severity}\x1b[0m: ${r.type}`);
    console.log(`    File:   ${r.file} (Line: ${r.line})`);
    console.log(`    Detail: ${r.description}`);
    console.log(`    Fix:    \x1b[36m${r.fix}\x1b[0m`);
    console.log("    ---------------------------------------------------");
  });

  if (totalVulnerabilities > 0) {
    console.log("\n\x1b[31m❌ DEPLOYMENT BLOCKED: Critical vulnerabilities found. Resolve all CRITICAL issues before scaling to production.\x1b[0m\n");
    process.exit(1);
  } else {
    console.log("\n\x1b[33m✔ WARN: Staging build is clear of critical blocks, but resolve warnings to ensure premium audit scores.\x1b[0m\n");
    process.exit(0);
  }
}

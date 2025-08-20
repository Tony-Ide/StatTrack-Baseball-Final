"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = 'https://lmxfgotzvhqfqwrcahbb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteGZnb3R6dmhxZnF3cmNhaGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5Mzg2NTYsImV4cCI6MjA2ODUxNDY1Nn0.u-fhEP4jnHMkVMrQFSO0R6kGhflamEEQs5sPrPZXPoc';
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);

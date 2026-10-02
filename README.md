<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin - Rivalry Showdown</title>
    <style>
      body {
        margin: 0;
        font-family: 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #f8fbff, #eefbf4);
        color: #2f3542;
        padding: 28px;
      }
      .container {
        max-width: 760px;
        margin: 0 auto;
      }
      .card {
        background: white;
        border-radius: 18px;
        padding: 24px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
      }
      h1 { margin-top: 0; }
      .notice {
        background: #fff3cd;
        border: 1px solid #ffe69c;
        color: #7a4d00;
        padding: 12px 14px;
        border-radius: 10px;
        margin-bottom: 18px;
        display: none;
      }
      .notice.show { display: block; }
      .admin-form {
        display: flex;
        gap: 12px;
        margin-top: 18px;
        margin-bottom: 18px;
      }
      input, button {
        font: inherit;
      }
      input {
        flex: 1;
        padding: 12px 14px;
        border: 1px solid #dfe4ea;
        border-radius: 10px;
      }
      button {
        background: linear-gradient(180deg, #2ed573, #1ebf60);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 12px 18px;
        font-weight: 700;
        cursor: pointer;
      }
      .category-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .category-list li {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 10px 12px;
        border-radius: 10px;
        margin-bottom: 10px;
      }
      .link {
        display: inline-block;
        margin-top: 16px;
        color: #1e90ff;
        text-decoration: none;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <h1>Admin Panel</h1>
        <div class="notice" id="notice"></div>
        <div id="access-denied" style="display:none;">
          <p>Access denied. Use the correct admin link.</p>
          <a class="link" href="index.html">Go back to the site</a>
        </div>

        <div id="admin-panel" style="display:none;">
          <form id="category-form">
            <div class="admin-form">
              <input type="text" id="category-name" placeholder="Add a new category" required />
              <button type="submit">Add Category</button>
            </div>
          </form>

          <h3>Current Categories</h3>
          <ul class="category-list" id="category-list"></ul>
          <a class="link" href="index.html">Back to rivalry site</a>
        </div>
      </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="config.js"></script>
    <script>
      const notice = document.getElementById('notice');
      const accessDenied = document.getElementById('access-denied');
      const adminPanel = document.getElementById('admin-panel');
      const categoryList = document.getElementById('category-list');
      const categoryForm = document.getElementById('category-form');
      const categoryNameInput = document.getElementById('category-name');

      const supabaseUrl = window.__SUPABASE_URL__;
      const supabaseKey = window.__SUPABASE_ANON_KEY__;
      const adminKey = window.__ADMIN_KEY__;
      const supabase = supabaseUrl && supabaseKey ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

      function showNotice(message) {
        notice.textContent = message;
        notice.classList.add('show');
      }

      const params = new URLSearchParams(window.location.search);
      const passedKey = params.get('key');

      if (!adminKey || passedKey !== adminKey) {
        accessDenied.style.display = 'block';
        return;
      }

      adminPanel.style.display = 'block';

      async function loadCategories() {
        if (!supabase) {
          showNotice('Supabase is not connected.');
          return;
        }

        const { data, error } = await supabase
          .from('categories')
          .select('name')
          .order('name', { ascending: true });

        if (error) {
          showNotice('Could not load categories: ' + error.message);
          return;
        }

        categoryList.innerHTML = '';
        (data || []).forEach((item) => {
          const li = document.createElement('li');
          li.textContent = item.name;
          categoryList.appendChild(li);
        });
      }

      categoryForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!supabase) {
          showNotice('Supabase is not connected.');
          return;
        }

        const name = categoryNameInput.value.trim();
        if (!name) return;

        const { error } = await supabase.from('categories').insert({ name });

        if (error) {
          showNotice('Could not add category: ' + error.message);
          return;
        }

        categoryNameInput.value = '';
        showNotice('Category added successfully.');
        await loadCategories();
      });

      loadCategories();
    </script>
  </body>
</html>

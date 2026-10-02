const notice = document.getElementById('notice');
const container = document.getElementById('polls-container');
const form = document.getElementById('create-poll-form');
const categorySelect = document.getElementById('poll-category');
const categoryInput = document.getElementById('new-category-input');

const supabaseUrl = window.__SUPABASE_URL__;
const supabaseKey = window.__SUPABASE_ANON_KEY__;
const defaultCategories = window.__DEFAULT_CATEGORIES__ || [
  'Indian Culinary Cuisine',
  'Sports Legends',
  'Pop Culture & Others'
];

const supabase = supabaseUrl && supabaseKey ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;
const voterKey = localStorage.getItem('rivalry_voter_key') || crypto.randomUUID();
localStorage.setItem('rivalry_voter_key', voterKey);
const voterName = localStorage.getItem('rivalry_voter_name') || 'User_' + voterKey.substring(0, 8);
localStorage.setItem('rivalry_voter_name', voterName);

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('PASTE_') || supabaseKey.includes('PASTE_')) {
  showNotice('Add your Supabase URL and anon key in config.js to enable shared voting.');
}

async function ensureCategories() {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .order('name', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      const rows = defaultCategories.map((name) => ({ name }));
      const { error: insertError } = await supabase.from('categories').insert(rows);
      if (insertError) throw insertError;
      return defaultCategories;
    }

    return data.map((item) => item.name);
  } catch (error) {
    console.error('Error loading categories:', error);
    return defaultCategories;
  }
}

async function loadCategories() {
  if (!categorySelect) return;

  try {
    const names = await ensureCategories();
    categorySelect.innerHTML = names
      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join('');
  } catch (error) {
    showNotice('Categories could not be loaded: ' + error.message);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function seedSamplePolls() {
  if (!supabase) return;

  try {
    const { data: existing } = await supabase.from('polls').select('id').limit(1);
    if (existing && existing.length > 0) return;

    const samplePolls = [
      {
        id: 'p_sample_1',
        category: 'Indian Culinary Cuisine',
        option_a: 'Biryani',
        option_b: 'Butter Chicken',
        votes_a: 6,
        votes_b: 4,
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'p_sample_2',
        category: 'Indian Culinary Cuisine',
        option_a: 'Samosa',
        option_b: 'Spring Roll',
        votes_a: 8,
        votes_b: 2,
        created_at: new Date(Date.now() - 72000000).toISOString()
      },
      {
        id: 'p_sample_3',
        category: 'Sports Legends',
        option_a: 'Virat Kohli',
        option_b: 'Rohit Sharma',
        votes_a: 5,
        votes_b: 5,
        created_at: new Date(Date.now() - 60000000).toISOString()
      },
      {
        id: 'p_sample_4',
        category: 'Sports Legends',
        option_a: 'Sachin Tendulkar',
        option_b: 'Brian Lara',
        votes_a: 7,
        votes_b: 3,
        created_at: new Date(Date.now() - 48000000).toISOString()
      },
      {
        id: 'p_sample_5',
        category: 'Pop Culture & Others',
        option_a: 'Marvel',
        option_b: 'DC',
        votes_a: 9,
        votes_b: 1,
        created_at: new Date(Date.now() - 36000000).toISOString()
      }
    ];

    const { error } = await supabase.from('polls').insert(samplePolls);
    if (error && !error.message.includes('duplicate')) {
      console.error('Error seeding polls:', error);
    }
  } catch (error) {
    console.error('Seed error:', error);
  }
}

async function loadPolls() {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showNotice('Could not load polls from the database: ' + error.message);
      return;
    }

    renderPolls(data || []);
  } catch (error) {
    showNotice('Error loading polls: ' + error.message);
  }
}

async function loadVotesForPoll(pollId) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('poll_votes')
      .select('*')
      .eq('poll_id', pollId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading votes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

function renderPolls(polls) {
  container.innerHTML = '';

  if (!polls.length) {
    container.innerHTML = '<p>No polls yet. Add one below.</p>';
    return;
  }

  const groups = {};
  polls.forEach((poll) => {
    if (!groups[poll.category]) groups[poll.category] = [];
    groups[poll.category].push(poll);
  });

  Object.entries(groups).forEach(([categoryName, pollList]) => {
    const header = document.createElement('h2');
    header.className = 'category-title';
    header.textContent = categoryName;
    container.appendChild(header);

    pollList.forEach((poll) => {
      const total = Number(poll.votes_a || 0) + Number(poll.votes_b || 0);
      const percentA = total === 0 ? 50 : Math.round((Number(poll.votes_a || 0) / total) * 100);
      const percentB = 100 - percentA;
      const alreadyVoted = hasVotedOnPoll(poll.id);

      const card = document.createElement('div');
      card.className = 'poll-card';
      card.innerHTML = `
        <div class="poll-header">${escapeHtml(poll.option_a)} vs ${escapeHtml(poll.option_b)}</div>
        <div class="poll-options">
          <button class="option-btn" ${alreadyVoted ? 'disabled' : ''} data-poll-id="${poll.id}" data-choice="A">
            <span>${escapeHtml(poll.option_a)}</span>
            <span>${percentA}%</span>
          </button>
          <div class="vs-badge">VS</div>
          <button class="option-btn" ${alreadyVoted ? 'disabled' : ''} data-poll-id="${poll.id}" data-choice="B">
            <span>${escapeHtml(poll.option_b)}</span>
            <span>${percentB}%</span>
          </button>
        </div>
        <div class="progress-container">
          <div class="progress-a" style="width:${percentA}%;"></div>
          <div class="progress-b" style="width:${percentB}%;"></div>
        </div>
        <div class="poll-footer">
          <span>${escapeHtml(poll.option_a)}: ${poll.votes_a || 0}</span>
          <span>Total: ${total}</span>
          <span>${escapeHtml(poll.option_b)}: ${poll.votes_b || 0}</span>
        </div>
        <div class="vote-details-toggle">
          <button class="toggle-btn" data-poll-id="${poll.id}">Show Vote Details</button>
        </div>
        <div class="vote-details" id="details-${poll.id}" style="display:none;"></div>
      `;

      container.appendChild(card);
    });
  });

  document.querySelectorAll('.option-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const pollId = button.dataset.pollId;
      const choice = button.dataset.choice;
      await handleVote(pollId, choice);
    });
  });

  document.querySelectorAll('.toggle-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const pollId = button.dataset.pollId;
      const detailsDiv = document.getElementById(`details-${pollId}`);
      
      if (detailsDiv.style.display === 'none') {
        const votes = await loadVotesForPoll(pollId);
        renderVoteDetails(pollId, votes);
        detailsDiv.style.display = 'block';
        button.textContent = 'Hide Vote Details';
      } else {
        detailsDiv.style.display = 'none';
        button.textContent = 'Show Vote Details';
      }
    });
  });
}

function renderVoteDetails(pollId, votes) {
  const detailsDiv = document.getElementById(`details-${pollId}`);
  
  if (!votes.length) {
    detailsDiv.innerHTML = '<p class="no-votes">No votes yet.</p>';
    return;
  }

  let html = '<div class="votes-list"><h4>All Votes</h4>';
  votes.forEach((vote) => {
    const voterDisplay = vote.voter_key.substring(0, 8);
    html += `<div class="vote-item">
      <span class="voter-name">${escapeHtml(voterDisplay)}</span>
      <span class="vote-choice">voted for <strong>${vote.choice === 'A' ? 'Option A' : 'Option B'}</strong></span>
      <span class="vote-time">${new Date(vote.created_at).toLocaleString()}</span>
    </div>`;
  });
  html += '</div>';
  
  detailsDiv.innerHTML = html;
}

function hasVotedOnPoll(pollId) {
  const saved = JSON.parse(localStorage.getItem('rivalry_user_votes') || '{}');
  return Boolean(saved[pollId]);
}

function setVotedOnPoll(pollId) {
  const saved = JSON.parse(localStorage.getItem('rivalry_user_votes') || '{}');
  saved[pollId] = true;
  localStorage.setItem('rivalry_user_votes', JSON.stringify(saved));
}

async function handleVote(pollId, choice) {
  if (!supabase) {
    showNotice('Supabase is not connected yet. Add your keys in config.js.');
    return;
  }

  if (hasVotedOnPoll(pollId)) {
    showNotice('You already voted in this poll.');
    return;
  }

  try {
    const { error: insertError } = await supabase
      .from('poll_votes')
      .insert({ poll_id: pollId, voter_key: voterKey, choice, voter_name: voterName });

    if (insertError) {
      if (insertError.message.includes('duplicate') || insertError.message.includes('already')) {
        showNotice('You already voted in this poll.');
        setVotedOnPoll(pollId);
        return;
      }
      showNotice('Vote failed: ' + insertError.message);
      return;
    }

    const increment = choice === 'A' ? { votes_a: 1 } : { votes_b: 1 };
    const { error: updateError } = await supabase
      .from('polls')
      .update(increment)
      .eq('id', pollId);

    if (updateError) {
      showNotice('Vote recorded but poll total could not be updated: ' + updateError.message);
      return;
    }

    setVotedOnPoll(pollId);
    showNotice('Vote submitted successfully.');
    await loadPolls();
  } catch (error) {
    showNotice('Error: ' + error.message);
  }
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!supabase) {
      showNotice('Supabase is not connected yet. Add your keys in config.js.');
      return;
    }

    const category = categorySelect ? categorySelect.value : 'General';
    const optionA = document.getElementById('option-a-input') ? document.getElementById('option-a-input').value.trim() : '';
    const optionB = document.getElementById('option-b-input') ? document.getElementById('option-b-input').value.trim() : '';

    if (!optionA || !optionB) {
      showNotice('Please fill in both options.');
      return;
    }

    const newPoll = {
      id: 'p_' + Date.now(),
      category,
      option_a: optionA,
      option_b: optionB,
      votes_a: 0,
      votes_b: 0,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('polls').insert(newPoll);

    if (error) {
      showNotice('Could not create poll: ' + error.message);
      return;
    }

    form.reset();
    showNotice('New poll created successfully.');
    await loadPolls();
  });
}

if (categoryInput) {
  const addCategoryBtn = document.getElementById('add-category-btn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', async () => {
      const categoryName = categoryInput.value.trim();
      
      if (!categoryName) {
        showNotice('Please enter a category name.');
        return;
      }

      if (!supabase) {
        showNotice('Supabase is not connected.');
        return;
      }

      try {
        const { error } = await supabase
          .from('categories')
          .insert({ name: categoryName });

        if (error) {
          showNotice('Could not add category: ' + error.message);
          return;
        }

        categoryInput.value = '';
        showNotice('Category added successfully.');
        await loadCategories();
      } catch (error) {
        showNotice('Error: ' + error.message);
      }
    });
  }
}

function showNotice(message) {
  if (!notice) return;
  notice.textContent = message;
  notice.classList.add('show');
  setTimeout(() => notice.classList.remove('show'), 3500);
}

async function init() {
  await seedSamplePolls();
  await loadCategories();
  await loadPolls();
}

init();

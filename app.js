const notice = document.getElementById('notice');
const container = document.getElementById('polls-container');
const form = document.getElementById('create-poll-form');

const supabaseUrl = window.__SUPABASE_URL__;
const supabaseKey = window.__SUPABASE_ANON_KEY__;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('PASTE_') || supabaseKey.includes('PASTE_')) {
  showNotice('Add your Supabase URL and anon key in config.js to enable shared voting.');
}

const supabase = supabaseUrl && supabaseKey ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;
const voterKey = localStorage.getItem('rivalry_voter_key') || crypto.randomUUID();
localStorage.setItem('rivalry_voter_key', voterKey);

async function loadPolls() {
  if (!supabase) return;

  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showNotice('Could not load polls from the database: ' + error.message);
    return;
  }

  renderPolls(data || []);
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
        <div class="poll-header">${poll.option_a} vs ${poll.option_b}</div>
        <div class="poll-options">
          <button class="option-btn" ${alreadyVoted ? 'disabled' : ''} data-poll-id="${poll.id}" data-choice="A">
            <span>${poll.option_a}</span>
            <span>${percentA}%</span>
          </button>
          <div class="vs-badge">VS</div>
          <button class="option-btn" ${alreadyVoted ? 'disabled' : ''} data-poll-id="${poll.id}" data-choice="B">
            <span>${poll.option_b}</span>
            <span>${percentB}%</span>
          </button>
        </div>
        <div class="progress-container">
          <div class="progress-a" style="width:${percentA}%;"></div>
          <div class="progress-b" style="width:${percentB}%;"></div>
        </div>
        <div class="poll-footer">
          <span>${poll.option_a}: ${poll.votes_a || 0}</span>
          <span>Total: ${total}</span>
          <span>${poll.option_b}: ${poll.votes_b || 0}</span>
        </div>
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

  const { error: insertError } = await supabase
    .from('poll_votes')
    .insert({ poll_id: pollId, voter_key: voterKey, choice });

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
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!supabase) {
    showNotice('Supabase is not connected yet. Add your keys in config.js.');
    return;
  }

  const category = document.getElementById('poll-category').value;
  const optionA = document.getElementById('option-a-input').value.trim();
  const optionB = document.getElementById('option-b-input').value.trim();

  if (!optionA || !optionB) return;

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

function showNotice(message) {
  notice.textContent = message;
  notice.classList.add('show');
  setTimeout(() => notice.classList.remove('show'), 3500);
}

loadPolls();

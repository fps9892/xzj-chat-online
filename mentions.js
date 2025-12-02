export class MentionsManager {
    constructor(inputElement, containerElement) {
        this.input = inputElement;
        this.container = containerElement;
        this.panel = null;
        this.users = [];
        this.activeIndex = -1;

        this.input.addEventListener('input', this.onInput.bind(this));
        this.input.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    updateUsers(users) {
        this.users = users.map(u => u.name);
    }

    onInput(e) {
        const cursorPos = this.input.selectionStart;
        const textUpToCursor = this.input.value.substring(0, cursorPos);
        const mentionMatch = textUpToCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            const query = mentionMatch[1].toLowerCase();
            const filteredUsers = this.users.filter(u => u.toLowerCase().startsWith(query));
            if (filteredUsers.length > 0) {
                this.showPanel(filteredUsers);
            } else {
                this.hidePanel();
            }
        } else {
            this.hidePanel();
        }
    }

    onKeyDown(e) {
        if (!this.panel) return;

        const items = this.panel.querySelectorAll('.mention-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.activeIndex = (this.activeIndex + 1) % items.length;
            this.updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.activeIndex = (this.activeIndex - 1 + items.length) % items.length;
            this.updateSelection(items);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (this.activeIndex > -1) {
                e.preventDefault();
                items[this.activeIndex].click();
            }
        } else if (e.key === 'Escape') {
            this.hidePanel();
        }
    }

    updateSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.activeIndex);
        });
    }

    showPanel(users) {
        this.hidePanel();
        this.panel = document.createElement('div');
        this.panel.className = 'mentions-panel';

        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'mention-item';
            item.textContent = user;
            item.addEventListener('click', () => this.selectUser(user));
            this.panel.appendChild(item);
        });

        this.container.style.position = 'relative';
        this.container.appendChild(this.panel);
        this.activeIndex = -1;

        document.addEventListener('click', this.onClickOutside.bind(this), true);
    }

    hidePanel() {
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
            document.removeEventListener('click', this.onClickOutside.bind(this), true);
        }
    }

    selectUser(username) {
        const currentVal = this.input.value;
        const cursorPos = this.input.selectionStart;
        const textBefore = currentVal.substring(0, cursorPos);
        const textAfter = currentVal.substring(cursorPos);

        const newTextBefore = textBefore.replace(/@\w*$/, `@${username} `);
        this.input.value = newTextBefore + textAfter;
        this.input.focus();
        this.input.setSelectionRange(newTextBefore.length, newTextBefore.length);
        this.hidePanel();
    }

    onClickOutside(e) {
        if (this.panel && !this.container.contains(e.target)) {
            this.hidePanel();
        }
    }
}
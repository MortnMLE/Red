<template>
  <div class="app">
    <div class ="wrapper">
      <div class="logo">
        Red<span class="dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </div>

      <div class="auth-card">
        <h1>{{ isLogin ? 'Login' : 'Create Account' }}</h1>

        <div class="toggle">
          <button
            :class="{ active: isLogin }"
            @click="isLogin = true"
          >
            Login
          </button>

          <button
            :class="{ active: !isLogin }"
            @click="isLogin = false"
          >
            Register
          </button>
        </div>

        <form @submit.prevent="handleSubmit">

          <div class="input-group">
            <label>Email</label>
            <input
              type="email"
              v-model="form.email"
              placeholder="Enter your email"
              required
            />
          </div>

          <div class="input-group">
            <label>Password</label>
            <input
              type="password"
              v-model="form.password"
              placeholder="Enter your password"
              required
            />
          </div>

          <div class="input-group" v-if="!isLogin">
            <label>Confirm Password</label>
            <input
              type="password"
              v-model="form.confirmPassword"
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" class="submit-btn">
            {{ isLogin ? 'Login' : 'Register' }}
          </button>
        </form>

        <p class="footer-text">
          {{
            isLogin
              ? "Don't have an account?"
              : "Already have an account?"
          }}

          <span @click="toggleMode">
            {{ isLogin ? 'Register here' : 'Login here' }}
          </span>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { POSTauthLogin, POSTauthRegister } from '@/constants/endpoints';
import { setAccessToken } from '@/services/accessToken';


export default {
  name: 'LoginPage',

  data() {
    return {
      isLogin: true,
      userId: '',
      isLoading: false,
      form: {
        email: '',
        password: '',
        confirmPassword: '',
      },
    };
  },

  methods: {
    toggleMode() {
      this.isLogin = !this.isLogin;
    },

    // TODO: handle submit logic
    async handleSubmit() {
      if (this.isLoading) {
        return;
      } 

      if (!this.isLogin && this.form.confirmPassword === '') {
        alert('Please confirm your password');
        return;
      }

      if (!this.isLogin && 
        this.form.password !== this.form.confirmPassword  
      ) {
        alert('Passwords do not match');
        return;
      }
      
      const endpoint = this.isLogin
      ? POSTauthLogin
      : POSTauthRegister;

      const body = {
        user: this.form.email,
        password: this.form.password
      };
      
      this.isLoading = true;
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        });

        const responseData = await response.json();

        if (responseData.success) {
          setAccessToken(responseData.token);
          localStorage.setItem('userId', responseData.id); 
          this.$router.push('/editor');
        } else {
          alert(responseData.message);
          return;
        }
      } catch (err) {
        alert(err.message);
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;

  background: #121212;

  padding: 16px;
}

.wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.logo {
  font-size: 100px;
  font-weight: bold;
  color: white;

  letter-spacing: 0.05em;
  white-space: nowrap;

  margin-bottom: 12px;
}

.dots span {
  opacity: 0;
  animation: blink 1.5s infinite;
  color: #f00817;
}

.dots span:nth-child(1) {
  animation-delay: 0s;
}

.dots span:nth-child(2) {
  animation-delay: 0.4s;
}

.dots span:nth-child(3) {
  animation-delay: 0.8s;
}

@keyframes blink {
  0% {
    opacity: 1;
  }
  65% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

.auth-card {
  width: min(360px, 100%);
  background: #252525;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.auth-card h1 {
  text-align: center;
  margin-bottom: 24px;
  color: white;
}

.toggle {
  display: flex;
  background: #393939;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 24px;
  color: white;
}

.toggle button {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: bold;
  color: white;
  transition: 0.3s;
}

.toggle button.active {
  background: #fa5c50;
  color: white;
}

.toggle button.active:hover {
  background: #fe7467;
}

.toggle button:hover {
  background: #4f4f4f;
}

.input-group {
  margin-bottom: 18px;
}

.input-group label {
  display: block;
  margin-bottom: 6px;
  color: #f53f38;
  font-size: 14px;
}

.input-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  transition: 0.2s;
}

.input-group input:focus {
  border-color: #fa5c50;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #fa5c50;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: 0.3s;
}

.submit-btn:hover {
  background: #fe7467;
}

.footer-text {
  text-align: center;
  margin-top: 18px;
  font-size: 14px;
  color: white;
}

.footer-text span {
  color: #f53f38;
  cursor: pointer;
  font-weight: bold;
  margin-left: 4px;
}
</style>
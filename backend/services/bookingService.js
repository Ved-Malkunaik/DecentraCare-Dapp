const users = {};

export function handleBookingFlow(userId, text) {
  if (!users[userId]) {
    users[userId] = { step: 1 };
    return "Hello 👋 Welcome to DecentraCare!\nWhat is your name?";
  }

  const state = users[userId];

  if (state.step === 1) {
    state.name = text;
    state.step = 2;
    return "Please enter appointment date (DD/MM)";
  }

  if (state.step === 2) {
    state.date = text;
    state.step = 3;
    return "Enter preferred time (Example: 5 PM)";
  }

  if (state.step === 3) {
    state.time = text;
    state.step = 4;

    return `✅ Appointment Booked!

👤 Name: ${state.name}
📅 Date: ${state.date}
⏰ Time: ${state.time}

We look forward to seeing you!`;
  }

  return "Send any message to book a new appointment.";
}

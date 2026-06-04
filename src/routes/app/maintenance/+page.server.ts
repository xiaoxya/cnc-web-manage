export const load = async () => {
  return {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
  };
};

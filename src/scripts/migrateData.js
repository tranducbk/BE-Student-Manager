const mongoose = require("mongoose");
const University = require("../models/university");
const Organization = require("../models/organization");
const EducationLevel = require("../models/education_level");
const Class = require("../models/class");

// Kết nối database
mongoose.connect("mongodb://localhost:27017/student-manager", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const migrateData = async () => {
  try {
    console.log("Bắt đầu migration dữ liệu...");

    // Xóa dữ liệu cũ trong các collection mới
    await Organization.deleteMany({});
    await EducationLevel.deleteMany({});
    await Class.deleteMany({});

    // Lấy tất cả universities cũ
    const oldUniversities = await University.find({});

    for (const oldUni of oldUniversities) {
      console.log(`Đang xử lý university: ${oldUni.universityName}`);

      // Xử lý organizations
      if (oldUni.organizations && oldUni.organizations.length > 0) {
        for (const oldOrg of oldUni.organizations) {
          // Tạo organization mới
          const newOrganization = new Organization({
            organizationName: oldOrg.organization,
            universityId: oldUni._id,
            totalStudents: oldOrg.totalStudents || 0,
            status: "active",
          });

          await newOrganization.save();
          console.log(
            `Đã tạo organization: ${newOrganization.organizationName}`
          );

          // Xử lý education levels
          if (oldOrg.educationLevels && oldOrg.educationLevels.length > 0) {
            for (const oldLevel of oldOrg.educationLevels) {
              // Tạo education level mới
              const newEducationLevel = new EducationLevel({
                levelName: oldLevel.level,
                organizationId: newOrganization._id,
                universityId: oldUni._id,
                totalStudents: oldLevel.studentCount || 0,
                status: "active",
              });

              await newEducationLevel.save();
              console.log(
                `Đã tạo education level: ${newEducationLevel.levelName}`
              );

              // Xử lý classes
              if (oldLevel.classes && oldLevel.classes.length > 0) {
                for (const className of oldLevel.classes) {
                  // Tạo class mới
                  const newClass = new Class({
                    className: className,
                    educationLevelId: newEducationLevel._id,
                    organizationId: newOrganization._id,
                    universityId: oldUni._id,
                    studentCount: 0,
                    maxStudents: 50,
                    status: "active",
                  });

                  await newClass.save();
                  console.log(`Đã tạo class: ${newClass.className}`);
                }
              }
            }
          }
        }
      }
    }

    console.log("Migration hoàn thành!");
  } catch (error) {
    console.error("Lỗi migration:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Chạy migration
migrateData();
